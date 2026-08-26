// Manually marks a student for a session - covers students who couldn't
// scan (no phone, expired QR, etc). If a record already exists for this
// student+session, this route rejects - use PATCH /api/teacher/attendance/:id
// to change an existing one instead, since that path is what writes the
// audit log entry.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { manualMarkSchema } from "@/lib/validations/attendance";

// POST /api/teacher/attendance
export async function POST(req: NextRequest) {
  const user = await requireRole(["TEACHER"]);
  if (isErrorResponse(user)) return user;

  const body = await req.json();
  const parsed = manualMarkSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
  const { sessionId, studentId, status } = parsed.data;

  const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId } });
  if (!teacher) return errorResponse("teacher profile not found", 404);

  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) return errorResponse("session not found", 404);
  if (session.createdByTeacherId !== teacher.id) {
    return errorResponse("this isn't your session", 403);
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_subjectSectionId: {
        studentId,
        subjectSectionId: session.subjectSectionId,
      },
    },
  });
  if (!enrollment) return errorResponse("this student isn't enrolled in this subject", 400);

  const existing = await prisma.attendanceRecord.findUnique({
    where: { sessionId_studentId: { sessionId, studentId } },
  });
  if (existing) {
    return errorResponse(
      "a record already exists for this student - use PATCH to update it instead",
      409
    );
  }

  const record = await prisma.attendanceRecord.create({
    data: { sessionId, studentId, status, markedVia: "MANUAL" },
  });

  return NextResponse.json(record, { status: 201 });
}
