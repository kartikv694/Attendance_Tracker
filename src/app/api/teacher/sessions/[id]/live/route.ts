// GET /api/teacher/sessions/:id/live
//
// Powers the "Live Attendance" sidebar page. Unlike GET /:id (which only
// returns rows that already have an AttendanceRecord), this merges in
// every student ENROLLED in the session's subject-section, so a student
// who hasn't marked themselves yet still shows up - as PENDING - instead
// of being invisible. That's the whole point of the live view: a teacher
// watching an active session wants to see who's still missing, not just
// who has already scanned in.
//
// PENDING is a display-only status - it's never written to the DB. Once
// the session is closed, PATCH /:id sweeps every still-missing student
// into a real ABSENT record (see that route), so by the time a closed
// session is viewed here there should be no PENDING rows left.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["TEACHER"]);
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId } });
  if (!teacher) return errorResponse("teacher profile not found", 404);

  const session = await prisma.attendanceSession.findUnique({
    where: { id },
    include: {
      subjectSection: {
        include: {
          subject: { select: { name: true, code: true } },
          section: { select: { name: true, year: true } },
        },
      },
    },
  });
  if (!session) return errorResponse("session not found", 404);
  if (session.createdByTeacherId !== teacher.id) {
    return errorResponse("this isn't your session", 403);
  }

  const [enrollments, records] = await Promise.all([
    prisma.enrollment.findMany({
      where: { subjectSectionId: session.subjectSectionId },
      include: {
        student: {
          select: { id: true, rollNumber: true, user: { select: { name: true } } },
        },
      },
      orderBy: { student: { rollNumber: "asc" } },
    }),
    prisma.attendanceRecord.findMany({
      where: { sessionId: id },
    }),
  ]);

  const recordByStudentId = new Map(records.map((r) => [r.studentId, r]));

  const roster = enrollments.map(({ student }) => {
    const record = recordByStudentId.get(student.id);
    return {
      student,
      recordId: record?.id ?? null,
      status: record?.status ?? ("PENDING" as const),
      markedVia: record?.markedVia ?? null,
      markedAt: record?.markedAt ?? null,
    };
  });

  const counts = {
    total: roster.length,
    present: roster.filter((r) => r.status === "PRESENT").length,
    late: roster.filter((r) => r.status === "LATE").length,
    absent: roster.filter((r) => r.status === "ABSENT").length,
    pending: roster.filter((r) => r.status === "PENDING").length,
  };

  return NextResponse.json({
    session,
    roster,
    counts,
  });
}
