// Enrolls a student into a specific subject-section. This is what determines
// eligibility later - a student can only be marked present in a session if
// they hold an Enrollment for that session's subject-section.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { createEnrollmentSchema } from "@/lib/validations/admin";

export async function GET(req: NextRequest) {
    const user = await requireRole(["ADMIN", "TEACHER"]);
    if (isErrorResponse(user)) return user;
    
    const studentId = req.nextUrl.searchParams.get("studentId");
    
    const enrollments = await prisma.enrollment.findMany({
        where: studentId ? { studentId } : undefined,
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
    });
    
    return NextResponse.json({ data: enrollments });
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
