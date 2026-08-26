// Exports attendance records for a class the teacher owns, in CSV or Excel format.
// The browser downloads it as a file.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { exportFormatSchema } from "@/lib/validations/export";
import { generateCSV, generateExcel } from "@/lib/export";

// GET /api/teacher/reports/export?subjectSectionId=...&format=csv
export async function GET(req: NextRequest) {
  const user = await requireRole(["TEACHER"]);
  if (isErrorResponse(user)) return user;

  const subjectSectionId = req.nextUrl.searchParams.get("subjectSectionId");
  const format = req.nextUrl.searchParams.get("format") || "csv";

  const parsed = exportFormatSchema.safeParse({ format });
  if (!parsed.success) return errorResponse("invalid format (use csv or xlsx)", 400);

  if (!subjectSectionId) return errorResponse("subjectSectionId is required", 400);

  const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId } });
  if (!teacher) return errorResponse("teacher profile not found", 404);

  const subjectSection = await prisma.subjectSection.findUnique({
    where: { id: subjectSectionId },
    include: { subject: { select: { code: true } } },
  });
  if (!subjectSection) return errorResponse("subject-section not found", 404);
  if (subjectSection.teacherId !== teacher.id) {
    return errorResponse("you don't teach this subject-section", 403);
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { session: { subjectSectionId } },
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

  const fileName = `${subjectSection.subject.code}-attendance-${Date.now()}`;
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
