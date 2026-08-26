// Powers the student's "Section" page - only ever the ONE section this
// student actually belongs to (never a picker across all sections), and the
// full roster of classmates within it.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";

// GET /api/student/section
export async function GET() {
  const user = await requireRole(["STUDENT"]);
  if (isErrorResponse(user)) return user;

  const student = await prisma.student.findUnique({
    where: { userId: user.userId },
    include: { section: true },
  });
  if (!student) return errorResponse("student profile not found", 404);

  const classmates = await prisma.student.findMany({
    where: { sectionId: student.sectionId },
    include: {
      user: { select: { name: true, email: true } },
      section: { select: { name: true, year: true } },
    },
    orderBy: { rollNumber: "asc" },
  });

  return NextResponse.json({
    section: { name: student.section.name, year: student.section.year },
    students: classmates,
  });
}
