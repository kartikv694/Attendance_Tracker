// One row per enrolled student, showing their attendance percentage for
// THIS subject-section. This is the view a teacher would actually use to
// spot who's falling behind - and what the bonus "percentage warning"
// feature will read from later.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";

// GET /api/teacher/reports/summary?subjectSectionId=...
export async function GET(req: NextRequest) {
  const user = await requireRole(["TEACHER"]);
  if (isErrorResponse(user)) return user;

  const subjectSectionId = req.nextUrl.searchParams.get("subjectSectionId");
  if (!subjectSectionId) return errorResponse("subjectSectionId is required", 400);

  const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId } });
  if (!teacher) return errorResponse("teacher profile not found", 404);

  const subjectSection = await prisma.subjectSection.findUnique({
    where: { id: subjectSectionId },
  });
  if (!subjectSection) return errorResponse("subject-section not found", 404);
  if (subjectSection.teacherId !== teacher.id) {
    return errorResponse("you don't teach this subject-section", 403);
  }

  const totalSessions = await prisma.attendanceSession.count({
    where: { subjectSectionId },
  });

  const enrollments = await prisma.enrollment.findMany({
    where: { subjectSectionId },
    include: { student: { include: { user: { select: { name: true } } } } },
  });

  const perStudent = await Promise.all(
    enrollments.map(async (enrollment) => {
      const attendedCount = await prisma.attendanceRecord.count({
        where: {
          studentId: enrollment.studentId,
          status: { in: ["PRESENT", "LATE"] },
          session: { subjectSectionId },
        },
      });

      return {
        student: enrollment.student,
        attended: attendedCount,
        absent: totalSessions - attendedCount,
        percentage:
          totalSessions === 0 ? null : Math.round((attendedCount / totalSessions) * 1000) / 10,
      };
    })
  );

  return NextResponse.json({ totalSessions, students: perStudent });
}
