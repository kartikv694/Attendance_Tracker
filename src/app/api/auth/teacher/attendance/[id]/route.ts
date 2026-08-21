// Changes an existing attendance record's status (e.g. a student was
// marked ABSENT but had a valid medical excuse, so the teacher flips it
// to PRESENT). Every change here writes an AttendanceAuditLog row too -
// wrapped in a transaction so the status update and the audit entry
// either both happen or neither does.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { updateAttendanceSchema } from "@/lib/validations/attendance";

// PATCH /api/teacher/attendance/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["TEACHER"]);
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateAttendanceSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
  const { status, reason } = parsed.data;

  const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId } });
  if (!teacher) return errorResponse("teacher profile not found", 404);

  const record = await prisma.attendanceRecord.findUnique({
    where: { id },
    include: { session: true },
  });
  if (!record) return errorResponse("attendance record not found", 404);

  if (record.session.createdByTeacherId !== teacher.id) {
    return errorResponse("this isn't your session", 403);
  }

  // nothing actually changed - don't bother writing a no-op audit entry
  if (record.status === status) {
    return NextResponse.json(record);
  }

  const [updatedRecord] = await prisma.$transaction([
    prisma.attendanceRecord.update({
      where: { id },
      data: { status },
    }),
    prisma.attendanceAuditLog.create({
      data: {
        attendanceRecordId: id,
        changedByUserId: user.userId,
        previousStatus: record.status,
        newStatus: status,
        reason,
      },
    }),
  ]);

  return NextResponse.json(updatedRecord);
}
