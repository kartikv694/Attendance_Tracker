import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";

// DELETE /api/admin/timetable/:id - remove a lecture slot from the timetable
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const slot = await prisma.timetableSlot.findUnique({ where: { id } });
  if (!slot) return errorResponse("timetable slot not found", 404);

  await prisma.timetableSlot.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
