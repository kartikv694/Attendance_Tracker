// The student's weekly timetable - one row per scheduled lecture across
// every subject-section they're enrolled in. Grouped by day on the
// frontend; this route just returns the flat list sorted by day + time.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";

const DAY_INDEX: Record<string, number> = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
};

// GET /api/student/timetable
export async function GET() {
  const user = await requireRole(["STUDENT"]);
  if (isErrorResponse(user)) return user;

  const student = await prisma.student.findUnique({ where: { userId: user.userId } });
  if (!student) return errorResponse("student profile not found", 404);

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: student.id },
    select: { subjectSectionId: true },
  });
  const subjectSectionIds = enrollments.map((e) => e.subjectSectionId);

  const slots = subjectSectionIds.length
    ? await prisma.timetableSlot.findMany({
        where: { subjectSectionId: { in: subjectSectionIds } },
        include: {
          subjectSection: {
            include: {
              subject: { select: { name: true, code: true } },
              section: { select: { name: true, year: true } },
              teacher: { include: { user: { select: { name: true } } } },
            },
          },
        },
      })
    : [];

  const schedule = slots
    .map((slot) => ({
      subjectSectionId: slot.subjectSectionId,
      subject: slot.subjectSection.subject,
      section: slot.subjectSection.section,
      teacher: slot.subjectSection.teacher.user.name,
      day: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }))
    .sort((a, b) => DAY_INDEX[a.day] - DAY_INDEX[b.day] || a.startTime.localeCompare(b.startTime));

  return NextResponse.json({ schedule });
}
