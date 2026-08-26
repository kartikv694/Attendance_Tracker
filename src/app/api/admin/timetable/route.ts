// The weekly timetable, built out of TimetableSlot rows. Admin-only to
// write (this is what defines the college's actual schedule), readable by
// admin/teacher/student since all three views need it - the student
// timetable, the teacher's "pick a lecture time" session form, and the
// admin management screen itself.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { createTimetableSlotSchema } from "@/lib/validations/admin";

// GET /api/admin/timetable?sectionId=...&subjectSectionId=...
export async function GET(req: NextRequest) {
  const user = await requireRole(["ADMIN", "TEACHER", "STUDENT"]);
  if (isErrorResponse(user)) return user;

  const sectionId = req.nextUrl.searchParams.get("sectionId");
  const subjectSectionId = req.nextUrl.searchParams.get("subjectSectionId");

  const slots = await prisma.timetableSlot.findMany({
    where: {
      ...(subjectSectionId ? { subjectSectionId } : {}),
      ...(sectionId ? { subjectSection: { sectionId } } : {}),
    },
    include: {
      subjectSection: {
        include: {
          subject: { select: { name: true, code: true } },
          section: { select: { id: true, name: true, year: true } },
          teacher: { include: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({ data: slots });
}

// POST /api/admin/timetable - schedule a subject-section into a weekly slot
export async function POST(req: NextRequest) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const body = await req.json();
  const parsed = createTimetableSlotSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
  const { subjectSectionId, dayOfWeek, startTime, endTime } = parsed.data;

  const subjectSection = await prisma.subjectSection.findUnique({
    where: { id: subjectSectionId },
    include: { section: true, teacher: true },
  });
  if (!subjectSection) return errorResponse("subject-section not found", 404);

  // a section can't attend two different lectures at the same time, and a
  // teacher can't teach two different lectures at the same time either -
  // check both clash types across every OTHER subject-section that shares
  // this section or this teacher
  const overlapping = await prisma.timetableSlot.findMany({
    where: {
      dayOfWeek,
      subjectSection: {
        OR: [{ sectionId: subjectSection.sectionId }, { teacherId: subjectSection.teacherId }],
      },
    },
    include: {
      subjectSection: {
        include: { subject: { select: { name: true, code: true } } },
      },
    },
  });

  const clash = overlapping.find((slot) => {
    // two ranges overlap if one starts before the other ends, both ways
    return startTime < slot.endTime && slot.startTime < endTime;
  });

  if (clash) {
    const isSameSection = clash.subjectSection.sectionId === subjectSection.sectionId;
    return errorResponse(
      isSameSection
        ? `this section already has ${clash.subjectSection.subject.code} scheduled ${dayOfWeek} ${clash.startTime}-${clash.endTime}`
        : `this teacher already has ${clash.subjectSection.subject.code} scheduled ${dayOfWeek} ${clash.startTime}-${clash.endTime}`,
      409
    );
  }

  const slot = await prisma.timetableSlot.create({
    data: { subjectSectionId, dayOfWeek, startTime, endTime },
    include: {
      subjectSection: {
        include: {
          subject: { select: { name: true, code: true } },
          section: { select: { id: true, name: true, year: true } },
          teacher: { include: { user: { select: { name: true } } } },
        },
      },
    },
  });

  return NextResponse.json(slot, { status: 201 });
}
