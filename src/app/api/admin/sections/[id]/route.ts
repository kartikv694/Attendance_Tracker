import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { updateSectionSchema } from "@/lib/validations/admin";

// PATCH /api/admin/sections/:id - update a section's name/year
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const section = await prisma.section.findUnique({ where: { id } });
  if (!section) return errorResponse("section not found", 404);

  const body = await req.json();
  const parsed = updateSectionSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

  const existing = await prisma.section.findFirst({
    where: { name: parsed.data.name, year: parsed.data.year, id: { not: id } },
  });
  if (existing) return errorResponse("a section with this name and year already exists", 409);

  const updated = await prisma.section.update({
    where: { id },
    data: parsed.data,
    include: { _count: { select: { students: true } } },
  });
  return NextResponse.json(updated);
}

// DELETE /api/admin/sections/:id - remove a section
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const section = await prisma.section.findUnique({
    where: { id },
    include: { _count: { select: { students: true, subjectSections: true } } },
  });
  if (!section) return errorResponse("section not found", 404);

  if (section._count.students > 0) {
    return errorResponse("this section still has students in it - move or remove them first", 409);
  }
  if (section._count.subjectSections > 0) {
    return errorResponse(
      "this section still has subjects assigned to it - remove those assignments first",
      409
    );
  }

  await prisma.section.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
