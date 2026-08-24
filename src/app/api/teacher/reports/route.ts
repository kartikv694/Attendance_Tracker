// Attendance records across every session of ONE subject-section, always
// scoped to a class the calling teacher actually teaches. Filterable by
// student, status, and a date range; paginated like every other list route.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { teacherReportFilterSchema } from "@/lib/validations/reports";

// GET /api/teacher/reports
export async function GET(req: NextRequest) {
  const user = await requireRole(["TEACHER"]);
  if (isErrorResponse(user)) return user;

  const query = teacherReportFilterSchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  if (!query.success) return errorResponse(query.error.issues[0].message, 400);
  const { page, pageSize, subjectSectionId, studentId, status, from, to } = query.data;

  const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId } });
  if (!teacher) return errorResponse("teacher profile not found", 404);

  const subjectSection = await prisma.subjectSection.findUnique({
    where: { id: subjectSectionId },
  });
  if (!subjectSection) return errorResponse("subject-section not found", 404);
  if (subjectSection.teacherId !== teacher.id) {
    return errorResponse("you don't teach this subject-section", 403);
  }

  const sessionFilter: Record<string, unknown> = { subjectSectionId };
  if (from || to) {
    sessionFilter.sessionDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const where = {
    session: sessionFilter,
    ...(studentId ? { studentId } : {}),
    ...(status ? { status } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        student: { include: { user: { select: { name: true } } } },
        session: { select: { sessionDate: true } },
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
