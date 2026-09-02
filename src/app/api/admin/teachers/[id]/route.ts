import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { updateTeacherSchema } from "@/lib/validations/admin";

// PATCH /api/admin/teachers/:id - update a teacher's profile
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) return errorResponse("teacher not found", 404);

  const body = await req.json();
  const parsed = updateTeacherSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
  const { name, email, employeeCode } = parsed.data;

  const emailTaken = await prisma.user.findFirst({
    where: { email, id: { not: teacher.userId } },
  });
  if (emailTaken) return errorResponse("a user with this email already exists", 409);

  const codeTaken = await prisma.teacher.findFirst({
    where: { employeeCode, id: { not: id } },
  });
  if (codeTaken) return errorResponse("this employee code is already in use", 409);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: teacher.userId }, data: { name, email } });
    return tx.teacher.update({
      where: { id },
      data: { employeeCode },
      include: { user: { select: { name: true, email: true } } },
    });
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/teachers/:id - remove a teacher account
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      classSection: { select: { id: true } },
      _count: { select: { subjectSections: true, sessionsCreated: true } },
    },
  });
  if (!teacher) return errorResponse("teacher not found", 404);

  // each of these is a real FK with no cascade - clear them first rather
  // than leaving orphaned references
  if (teacher.classSection) {
    return errorResponse(
      "this teacher is still the class-teacher of a section - unassign them first",
      409
    );
  }
  if (teacher._count.subjectSections > 0) {
    return errorResponse(
      "this teacher is still assigned to teach one or more subjects - remove those assignments first",
      409
    );
  }
  if (teacher._count.sessionsCreated > 0) {
    return errorResponse("this teacher has taken attendance sessions and can't be deleted", 409);
  }

  // deleting the User cascades to delete the Teacher row too (see schema)
  await prisma.user.delete({ where: { id: teacher.userId } });

  return NextResponse.json({ success: true });
}
