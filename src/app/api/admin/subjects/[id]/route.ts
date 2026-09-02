import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { updateSubjectSchema } from "@/lib/validations/admin";

// PATCH /api/admin/subjects/:id - update a subject's name/code
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const subject = await prisma.subject.findUnique({ where: { id } });
  if (!subject) return errorResponse("subject not found", 404);

  const body = await req.json();
  const parsed = updateSubjectSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

  const codeTaken = await prisma.subject.findFirst({
    where: { code: parsed.data.code, id: { not: id } },
  });
  if (codeTaken) return errorResponse("a subject with this code already exists", 409);

  const updated = await prisma.subject.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

// DELETE /api/admin/subjects/:id - remove a subject
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const subject = await prisma.subject.findUnique({
    where: { id },
    include: { _count: { select: { subjectSections: true } } },
  });
  if (!subject) return errorResponse("subject not found", 404);

  if (subject._count.subjectSections > 0) {
    return errorResponse(
      "this subject is still assigned to one or more sections - remove those assignments first",
      409
    );
  }

  await prisma.subject.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
