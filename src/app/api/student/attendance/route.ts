// A student's own attendance history - paginated, optionally filtered by
// subject and a date range. Always scoped to the logged-in student only,
// there's no way to pass someone else's id here.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { studentHistoryFilterSchema } from "@/lib/validations/reports";

// GET /api/student/attendance
export async function GET(req: NextRequest) {
  const user = await requireRole(["STUDENT"]);
  if (isErrorResponse(user)) return user;

  const query = studentHistoryFilterSchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  if (!query.success) return errorResponse(query.error.issues[0].message, 400);
  const { page, pageSize, subjectSectionId, from, to } = query.data;

  const student = await prisma.student.findUnique({ where: { userId: user.userId } });
  if (!student) return errorResponse("student profile not found", 404);

  // filters on the related session's fields - subject and date range both
  // live on AttendanceSession, not on the record itself
  const sessionFilter: Record<string, unknown> = {};
  if (subjectSectionId) sessionFilter.subjectSectionId = subjectSectionId;
  if (from || to) {
    sessionFilter.sessionDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const where = {
    studentId: student.id,
    ...(Object.keys(sessionFilter).length ? { session: sessionFilter } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        session: {
          include: {
            subjectSection: {
              include: {
                subject: { select: { name: true, code: true } },
                section: { select: { name: true, year: true } },
              },
            },
          },
        },
      },
      orderBy: { session: { sessionDate: "desc" } },
    }),
    prisma.attendanceRecord.count({ where }),
  ]);

  return NextResponse.json({
    data: records,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
