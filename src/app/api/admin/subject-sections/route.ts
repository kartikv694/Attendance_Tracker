// Assigns a teacher to teach a subject to a specific section.
// This is the row that AttendanceSession later attaches to - a teacher
// can only create a session for a subject-section they're actually assigned to.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { assignSubjectSectionSchema, paginationSchema } from "@/lib/validations/admin";

export async function GET(req: NextRequest) {
    const user = await requireRole(["ADMIN", "TEACHER"]);
    if (isErrorResponse(user)) return user;
    
  const parsedPagination = paginationSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsedPagination.success) return errorResponse("invalid pagination params", 400);
  const { page, pageSize } = parsedPagination.data;
  const search = (req.nextUrl.searchParams.get("search") || "").trim();
  const where = search ? {
    OR: [
      { subject: { name: { contains: search, mode: "insensitive" as const } } },
      { subject: { code: { contains: search, mode: "insensitive" as const } } },
      { section: { name: { contains: search, mode: "insensitive" as const } } },
      { teacher: { user: { name: { contains: search, mode: "insensitive" as const } } } },
    ],
  } : undefined;

  const [assignments, total] = await Promise.all([
    prisma.subjectSection.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
      subject: { select: { name: true, code: true } },
      section: { select: { id: true, name: true, year: true } },
      teacher: { include: { user: { select: { name: true } } } },
    },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subjectSection.count({ where }),
  ]);

return NextResponse.json({
  data: assignments,
  pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
});
}

// POST /api/admin/subject-sections
export async function POST(req: NextRequest) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const body = await req.json();
  const parsed = assignSubjectSectionSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
  const { subjectId, sectionId, teacherId } = parsed.data;

  // check all three actually exist before trying to link them -
  // gives a clean 404 instead of a raw Prisma foreign-key error
  const [subject, section, teacher] = await Promise.all([
    prisma.subject.findUnique({ where: { id: subjectId } }),
    prisma.section.findUnique({ where: { id: sectionId } }),
    prisma.teacher.findUnique({ where: { id: teacherId } }),
  ]);
  if (!subject) return errorResponse("subject not found", 404);
  if (!section) return errorResponse("section not found", 404);
  if (!teacher) return errorResponse("teacher not found", 404);

  const existing = await prisma.subjectSection.findUnique({
    where: { subjectId_sectionId: { subjectId, sectionId } },
  });
  if (existing) return errorResponse("this subject is already assigned to this section", 409);

  const assignment = await prisma.$transaction(async (tx) => {
    const created = await tx.subjectSection.create({
      data: { subjectId, sectionId, teacherId },
      include: {
        subject: { select: { name: true, code: true } },
        section: { select: { name: true, year: true } },
        teacher: { include: { user: { select: { name: true } } } },
      },
    });

    // Enroll all students already belonging to this section in the newly
    // created subject assignment so they can immediately mark attendance.
    const students = await tx.student.findMany({
      where: { sectionId },
      select: { id: true },
    });

    if (students.length > 0) {
      await tx.enrollment.createMany({
        data: students.map((student) => ({
          studentId: student.id,
          subjectSectionId: created.id,
        })),
        skipDuplicates: true,
      });
    }

    return created;
  });

  return NextResponse.json(assignment, { status: 201 });
}
