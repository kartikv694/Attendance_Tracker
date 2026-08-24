//
// The percentage view - one row per subject the student is enrolled in,
// showing how many sessions have been held so far vs how many they
// attended. PRESENT and LATE both count as "attended", only ABSENT (or
// simply never being marked at all) counts against them.
//
// Deliberately a separate route from /api/student/attendance (the raw
// history list) - this one does aggregate counting instead of returning
// individual records, different enough shape that mixing them into one
// response would make both harder to read.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";

// GET /api/student/attendance/summary
export async function GET() {
  const user = await requireRole(["STUDENT"]);
  if (isErrorResponse(user)) return user;

  const student = await prisma.student.findUnique({ where: { userId: user.userId } });
  if (!student) return errorResponse("student profile not found", 404);

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: student.id },
    include: {
      subjectSection: {
        include: {
          subject: { select: { name: true, code: true } },
          section: { select: { name: true, year: true } },
        },
      },
    },
  });

  const perSubject = await Promise.all(
    enrollments.map(async (enrollment) => {
      const subjectSectionId = enrollment.subjectSectionId;

      const [totalSessions, attendedCount] = await Promise.all([
        prisma.attendanceSession.count({ where: { subjectSectionId } }),
        prisma.attendanceRecord.count({
          where: {
            studentId: student.id,
            status: { in: ["PRESENT", "LATE"] },
            session: { subjectSectionId },
          },
        }),
      ]);

      return {
        subject: enrollment.subjectSection.subject,
        section: enrollment.subjectSection.section,
        totalSessions,
        attended: attendedCount,
        absent: totalSessions - attendedCount,
        // no sessions held yet - percentage doesn't mean anything, send null
        // instead of a misleading 0% or divide-by-zero NaN
        percentage: totalSessions === 0 ? null : Math.round((attendedCount / totalSessions) * 1000) / 10,
      };
    })
  );

  const overallTotal = perSubject.reduce((sum, s) => sum + s.totalSessions, 0);
  const overallAttended = perSubject.reduce((sum, s) => sum + s.attended, 0);

  return NextResponse.json({
    subjects: perSubject,
    overall: {
      totalSessions: overallTotal,
      attended: overallAttended,
      percentage:
        overallTotal === 0 ? null : Math.round((overallAttended / overallTotal) * 1000) / 10,
    },
  });
}
