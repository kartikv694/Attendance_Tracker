import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { updateStudentSchema } from "@/lib/validations/admin";

// PATCH /api/admin/students/:id - update a student's profile + section
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) return errorResponse("student not found", 404);

  const body = await req.json();
  const parsed = updateStudentSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
  const { name, email, rollNumber, sectionId } = parsed.data;

  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) return errorResponse("that section doesn't exist", 404);

  const emailTaken = await prisma.user.findFirst({
    where: { email, id: { not: student.userId } },
  });
  if (emailTaken) return errorResponse("a user with this email already exists", 409);

  const rollTaken = await prisma.student.findFirst({
    where: { rollNumber, id: { not: id } },
  });
  if (rollTaken) return errorResponse("this roll number is already in use", 409);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: student.userId }, data: { name, email } });

    // if the section changed, the old enrollments (tied to the old
    // section's subject-sections) no longer make sense - drop them and
    // re-enroll into whatever's assigned to the new section, same as what
    // happens automatically when a student is first created
    if (sectionId !== student.sectionId) {
      await tx.enrollment.deleteMany({ where: { studentId: id } });

      const assignments = await tx.subjectSection.findMany({
        where: { sectionId },
        select: { id: true },
      });
      if (assignments.length > 0) {
        await tx.enrollment.createMany({
          data: assignments.map((a) => ({ studentId: id, subjectSectionId: a.id })),
          skipDuplicates: true,
        });
      }
    }

    return tx.student.update({
      where: { id },
      data: { rollNumber, sectionId },
      include: {
        user: { select: { name: true, email: true } },
        section: { select: { name: true, year: true } },
      },
    });
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/students/:id - remove a student account
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: { _count: { select: { attendanceRecords: true } } },
  });
  if (!student) return errorResponse("student not found", 404);

  // deleting a student who already has attendance history would silently
  // erase that history (AttendanceRecord has no cascade from Student) -
  // block it instead of quietly destroying records a teacher relied on
  if (student._count.attendanceRecords > 0) {
    return errorResponse("this student has attendance history and can't be deleted", 409);
  }

  await prisma.$transaction(async (tx) => {
    await tx.enrollment.deleteMany({ where: { studentId: id } });
    // deleting the User cascades to delete the Student row too (see schema)
    await tx.user.delete({ where: { id: student.userId } });
  });

  return NextResponse.json({ success: true });
}
