// System-wide attendance export with optional filtering. Returns CSV or Excel.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { exportFormatSchema } from "@/lib/validations/export";
import { generateCSV, generateExcel } from "@/lib/export";
import { adminReportFilterSchema } from "@/lib/validations/reports";

// GET /api/admin/reports/export?format=csv&sectionId=...&from=...&to=...
export async function GET(req: NextRequest) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const format = req.nextUrl.searchParams.get("format") || "csv";
  const parsed = exportFormatSchema.safeParse({ format });
  if (!parsed.success) return errorResponse("invalid format (use csv or xlsx)", 400);

  const query = adminReportFilterSchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  if (!query.success) return errorResponse(query.error.issues[0].message, 400);
  const { sectionId, subjectId, teacherId, studentId, status, from, to } = query.data;

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

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: {
      student: { include: { user: { select: { name: true } } } },
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
  });

  const fileName = `attendance-export-${Date.now()}`;
  let fileBuffer: Buffer;

  if (parsed.data.format === "xlsx") {
    fileBuffer = await generateExcel(records as any);
  } else {
    fileBuffer = await generateCSV(records as any);
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type":
        parsed.data.format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv",
      "Content-Disposition": `attachment; filename="${fileName}.${parsed.data.format}"`,
    },
  });
}
