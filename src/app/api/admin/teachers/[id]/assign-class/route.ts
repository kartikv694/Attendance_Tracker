// POST   /api/admin/teachers/:id/assign-class  - make this teacher the
//        class-teacher of a section
// DELETE /api/admin/teachers/:id/assign-class  - remove them from whatever
//        section they're currently class-teacher of
//
// A section can have at most one class-teacher, and a teacher can be
// class-teacher of at most one section - both directions are enforced by
// the @unique on Section.classTeacherId in the schema, but we still check
// explicitly here first so the error message is clear instead of a raw
// Prisma constraint violation.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { assignClassTeacherSchema } from "@/lib/validations/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const { id: teacherId } = await params;
  const body = await req.json();
  const parsed = assignClassTeacherSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
  const { sectionId } = parsed.data;

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { classSection: true },
  });
  if (!teacher) return errorResponse("teacher not found", 404);
  if (teacher.classSection) {
    return errorResponse(
      `this teacher is already the class-teacher of ${teacher.classSection.name} - remove that assignment first`,
      409
    );
  }

  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) return errorResponse("section not found", 404);
  if (section.classTeacherId) {
    return errorResponse("this section already has a class-teacher assigned", 409);
  }

  const updated = await prisma.section.update({
    where: { id: sectionId },
    data: { classTeacherId: teacherId },
    include: { classTeacher: { include: { user: { select: { name: true } } } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const { id: teacherId } = await params;

  const section = await prisma.section.findFirst({ where: { classTeacherId: teacherId } });
  if (!section) return errorResponse("this teacher isn't a class-teacher of any section", 404);

  await prisma.section.update({
    where: { id: section.id },
    data: { classTeacherId: null },
  });

  return NextResponse.json({ success: true });
}
