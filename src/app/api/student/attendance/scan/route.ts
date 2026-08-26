//
// The core of the whole project. A student scans the QR (which just opens
// a page containing this token) and this route decides whether to actually
// mark them present. Three things have to be true:
//   1. the session this token belongs to still exists and is still active
//   2. the student is actually enrolled in that subject-section
//   3. they haven't already been marked for this session
//
// (3) is enforced TWICE on purpose: once as an explicit pre-check for a
// clean error message, and again by just letting the DB's unique
// constraint reject a genuine race (e.g. same student double-tapping fast,
// or two requests landing at almost the same time) - the pre-check alone
// can't fully prevent that, the DB constraint is the real guarantee.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { scanAttendanceSchema } from "@/lib/validations/attendance";

// POST /api/student/attendance/scan
export async function POST(req: NextRequest) {
  const user = await requireRole(["STUDENT"]);
  if (isErrorResponse(user)) return user;

  const body = await req.json();
  const parsed = scanAttendanceSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
  const { qrToken } = parsed.data;

  const session = await prisma.attendanceSession.findUnique({ where: { qrToken } });
  if (!session) return errorResponse("invalid qr code", 404);

  // An active attendance session remains scannable until the teacher closes it.
  // `expiresAt` controls QR rotation, not whether the whole attendance session
  // survives. This is important because logging out must not invalidate an
  // already-created class session.
  if (!session.isActive) {
    return errorResponse("this attendance session has been closed", 410);
  }

  const student = await prisma.student.findUnique({ where: { userId: user.userId } });
  if (!student) return errorResponse("student profile not found", 404);

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_subjectSectionId: {
        studentId: student.id,
        subjectSectionId: session.subjectSectionId,
      },
    },
  });
  if (!enrollment) {
    return errorResponse("you're not enrolled in this subject, can't be marked present", 403);
  }

  // pre-check for a clean message in the normal case
  const alreadyMarked = await prisma.attendanceRecord.findUnique({
    where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
  });
  if (alreadyMarked) {
    return errorResponse("you've already been marked present for this session", 409);
  }

  try {
    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: student.id,
        status: "PRESENT",
        markedVia: "QR",
      },
    });
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    // fallback for the race condition the pre-check above can't catch -
    // P2002 is Prisma's unique-constraint-violation code
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return errorResponse("you've already been marked present for this session", 409);
    }
    throw err;
  }
}
