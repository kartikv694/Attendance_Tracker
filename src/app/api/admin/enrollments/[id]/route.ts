import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";

// DELETE /api/admin/enrollments/:id - unenroll a student from a subject-section
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["ADMIN", "TEACHER"]);
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const enrollment = await prisma.enrollment.findUnique({
    where: { id },
    include: { subjectSection: { select: { teacherId: true } } },
  });
  if (!enrollment) return errorResponse("enrollment not found", 404);

  // same restriction as creating one - a teacher can only manage
  // enrollments for classes they actually teach
  if (user.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId } });
    if (!teacher || enrollment.subjectSection.teacherId !== teacher.id) {
      return errorResponse("you can only unenroll students from your own classes", 403);
    }
  }

  await prisma.enrollment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
