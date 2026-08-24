// Same shape as the teacher report, but system-wide - no ownership check,
// and extra filters (section/subject/teacher) since admin needs to slice
// across the whole institution, not just one class.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { adminReportFilterSchema } from "@/lib/validations/reports";

// GET /api/admin/reports
export async function GET(req: NextRequest) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const query = adminReportFilterSchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  if (!query.success) return errorResponse(query.error.issues[0].message, 400);
  const { page, pageSize, sectionId, subjectId, teacherId, studentId, status, from, to } =
    query.data;

  // filters that live on the session's subjectSection relation
  const subjectSectionFilter: Record<string, unknown> = {};
  if (sectionId) subjectSectionFilter.sectionId = sectionId;
  if (subjectId) subjectSectionFilter.subjectId = subjectId;
  if (teacherId) subjectSectionFilter.teacherId = teacherId;

  const sessionFilter: Record<string, unknown> = {};
  if (Object.keys(subjectSectionFilter).length) {
    sessionFilter.subjectSection = subjectSectionFilter;
  }
  if (from || to) {
    sessionFilter.sessionDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const where = {
    ...(Object.keys(sessionFilter).length ? { session: sessionFilter } : {}),
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
        session: {
          include: {
            subjectSection: {
              include: {
                subject: { select: { name: true, code: true } },
                section: { select: { name: true, year: true } },
                teacher: { include: { user: { select: { name: true } } } },
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
