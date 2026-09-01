// Read-only view over AttendanceAuditLog - every time an attendance
// record's status changed after the fact, whether that was a teacher's
// manual override or the automatic "session closed, still-missing
// students become ABSENT" sweep (those rows have previousStatus: null
// and changedByUserId set to whichever teacher closed the session).
// Admin-only since this is the audit trail for the whole institution,
// not scoped to any one teacher's classes.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { auditLogFilterSchema } from "@/lib/validations/reports";

// GET /api/admin/audit-logs
export async function GET(req: NextRequest) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const query = auditLogFilterSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) return errorResponse(query.error.issues[0].message, 400);
  const { page, pageSize, sectionId, subjectId, teacherId, studentId, changedByUserId, search, from, to } =
    query.data;

  // filters that live several relations deep off attendanceRecord
  const subjectSectionFilter: Record<string, unknown> = {};
  if (sectionId) subjectSectionFilter.sectionId = sectionId;
  if (subjectId) subjectSectionFilter.subjectId = subjectId;
  if (teacherId) subjectSectionFilter.teacherId = teacherId;

  const sessionFilter: Record<string, unknown> = {};
  if (Object.keys(subjectSectionFilter).length) {
    sessionFilter.subjectSection = subjectSectionFilter;
  }

  // The date picker represents the lecture/session date. Treat "to" as
  // inclusive by using the next midnight as an exclusive upper bound.
  // Previously the raw `to` date was used with `lte`, which only included
  // records at exactly 00:00:00 on that day. Audit logs are linked to the
  // attendance session, so filtering the session date is also consistent
  // with the reports/history pages.
  if (from || to) {
    const sessionDate: Record<string, Date> = {};
    if (from) sessionDate.gte = from;
    if (to) {
      const endExclusive = new Date(to);
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
      sessionDate.lt = endExclusive;
    }
    sessionFilter.sessionDate = sessionDate;
  }

  const recordFilter: Record<string, unknown> = {};
  if (Object.keys(sessionFilter).length) recordFilter.session = sessionFilter;
  if (studentId) recordFilter.studentId = studentId;

  const where: Prisma.AttendanceAuditLogWhereInput = {
    ...(Object.keys(recordFilter).length ? { attendanceRecord: recordFilter } : {}),
    ...(changedByUserId ? { changedByUserId } : {}),
    ...(search
      ? {
          OR: [
            { attendanceRecord: { student: { user: { name: { contains: search, mode: "insensitive" } } } } },
            { attendanceRecord: { session: { subjectSection: { subject: { name: { contains: search, mode: "insensitive" } } } } } },
            { attendanceRecord: { session: { subjectSection: { subject: { code: { contains: search, mode: "insensitive" } } } } } },
            { attendanceRecord: { session: { subjectSection: { section: { name: { contains: search, mode: "insensitive" } } } } } },
            { changedByUser: { name: { contains: search, mode: "insensitive" } } },
            { reason: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.attendanceAuditLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        changedByUser: { select: { name: true, email: true, role: true } },
        attendanceRecord: {
          include: {
            student: { include: { user: { select: { name: true } } } },
            session: {
              select: {
                sessionDate: true,
                subjectSection: {
                  include: {
                    subject: { select: { name: true, code: true } },
                    section: { select: { name: true, year: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { changedAt: "desc" },
    }),
    prisma.attendanceAuditLog.count({ where }),
  ]);

  return NextResponse.json({
    data: logs,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
