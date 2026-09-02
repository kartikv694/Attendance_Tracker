// Enrolls a student into a specific subject-section. This is what determines
// eligibility later - a student can only be marked present in a session if
// they hold an Enrollment for that session's subject-section.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { createEnrollmentSchema, paginationSchema } from "@/lib/validations/admin";

export async function GET(req: NextRequest) {
    const user = await requireRole(["ADMIN", "TEACHER"]);
    if (isErrorResponse(user)) return user;
    
    const studentId = req.nextUrl.searchParams.get("studentId");
    const parsedPagination = paginationSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsedPagination.success) return errorResponse("invalid pagination params", 400);
    const { page, pageSize } = parsedPagination.data;
    const search = (req.nextUrl.searchParams.get("search") || "").trim();
    const where = {
      ...(studentId ? { studentId } : {}),
      ...(search ? {
        OR: [
          { student: { user: { name: { contains: search, mode: "insensitive" as const } } } },
          { subjectSection: { subject: { name: { contains: search, mode: "insensitive" as const } } } },
          { subjectSection: { subject: { code: { contains: search, mode: "insensitive" as const } } } },
          { subjectSection: { section: { name: { contains: search, mode: "insensitive" as const } } } },
        ],
      } : {}),
    };

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
            student: { include: { user: { select: { name: true } } } },
            subjectSection: {
                include: {
                    subject: { select: { name: true, code: true } },
                    section: { select: { name: true, year: true } },
                },
            },
        },
        orderBy: { enrolledAt: "desc" },
      }),
      prisma.enrollment.count({ where }),
    ]);
    
    return NextResponse.json({
      data: enrollments,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
}

// POST /api/admin/enrollments
export async function POST(req: NextRequest) {
  const user = await requireRole(["ADMIN", "TEACHER"]);
  if (isErrorResponse(user)) return user;

  const body = await req.json();
  const parsed = createEnrollmentSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
  const { studentId, subjectSectionId } = parsed.data;

  const [student, subjectSection] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId } }),
    prisma.subjectSection.findUnique({ where: { id: subjectSectionId } }),
  ]);
  if (!student) return errorResponse("student not found", 404);
  if (!subjectSection) return errorResponse("subject-section assignment not found", 404);

  // a teacher can only enroll students into a subject-section THEY teach -
  // not any class in the system. admin has no such restriction.
  if (user.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId } });
    if (!teacher || subjectSection.teacherId !== teacher.id) {
      return errorResponse("you can only enroll students into your own classes", 403);
    }
  }

  const existing = await prisma.enrollment.findUnique({
    where: { studentId_subjectSectionId: { studentId, subjectSectionId } },
  });
  if (existing) return errorResponse("student is already enrolled in this subject", 409);

  const enrollment = await prisma.enrollment.create({
    data: { studentId, subjectSectionId },
    include: {
      student: { include: { user: { select: { name: true } } } },
      subjectSection: {
        include: {
          subject: { select: { name: true, code: true } },
          section: { select: { name: true, year: true } },
        },
      },
    },
  });

  return NextResponse.json(enrollment, { status: 201 });
}
