// Builds the "weekly timetable" view for the logged-in teacher's dashboard
// KPIs: how many students she teaches in total, how many lectures she's
// assigned, and - when the lectures KPI is clicked - which section/subject
// each lecture is for and when it runs.
//
// Backed by real TimetableSlot rows (admin-managed) rather than a computed
// placeholder - a subject-section assignment with no timetable slot yet
// just doesn't show up here until an admin schedules it.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";

// GET /api/teacher/schedule
export async function GET() {
  const user = await requireRole(["TEACHER"]);
  if (isErrorResponse(user)) return user;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: user.userId },
    include: { classSection: { select: { id: true, name: true, year: true } } },
  });
  if (!teacher) return errorResponse("teacher profile not found", 404);

  const assignments = await prisma.subjectSection.findMany({
    where: { teacherId: teacher.id },
    include: {
      subject: { select: { name: true, code: true } },
      section: { select: { id: true, name: true, year: true } },
      _count: { select: { enrollments: true } },
      timetableSlots: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const assignmentIds = assignments.map((a) => a.id);
  const distinctStudents = assignmentIds.length
    ? await prisma.enrollment.findMany({
        where: { subjectSectionId: { in: assignmentIds } },
        select: { studentId: true },
        distinct: ["studentId"],
      })
    : [];

  // one row per scheduled lecture (a subject-section can meet more than
  // once a week, so this can be more rows than assignments)
  const schedule = assignments.flatMap((assignment) =>
    assignment.timetableSlots.map((slot) => ({
      id: slot.id,
      subjectSectionId: assignment.id,
      subject: assignment.subject,
      section: assignment.section,
      day: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      studentsEnrolled: assignment._count.enrollments,
    }))
  );

  return NextResponse.json({
    totalStudents: distinctStudents.length,
    // Count every subject-section assigned to this teacher, even before an admin adds a timetable slot.
    totalLectures: assignments.length,
    scheduledLectures: schedule.length,
    classSection: teacher.classSection,
    schedule,
    // the raw assignment list, including ones with no timetable slot yet -
    // used by the "start a session" form on /teacher/sessions
    assignments: assignments.map((a) => ({
      subjectSectionId: a.id,
      subject: a.subject,
      section: a.section,
      studentsEnrolled: a._count.enrollments,
      timetableSlots: a.timetableSlots,
    })),
  });
}
