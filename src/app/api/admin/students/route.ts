import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { createStudentSchema, paginationSchema } from "@/lib/validations/admin";

// GET  /api/admin/students  - list all students (paginated, filterable by section)
export async function GET(req: NextRequest) {
    const user = await requireRole(["ADMIN", "TEACHER"]);
    if (isErrorResponse(user)) return user;

    const params = Object.fromEntries(req.nextUrl.searchParams);
  const query = paginationSchema.safeParse(params);
  if (!query.success) return errorResponse("invalid pagination params", 400);
  const { page, pageSize } = query.data;
  
  // optional filter - e.g. /api/admin/students?sectionId=abc123
  const sectionId = params.sectionId;
  
  const [students, total] = await Promise.all([
      prisma.student.findMany({
      where: sectionId ? { sectionId } : undefined,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { name: true, email: true } },
        section: { select: { name: true, year: true } },
    },
    orderBy: { rollNumber: "asc" },
}),
prisma.student.count({ where: sectionId ? { sectionId } : undefined }),
]);

return NextResponse.json({
    data: students,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
});
}

// POST /api/admin/students  - create a new student account
export async function POST(req: NextRequest) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const body = await req.json();
  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
  const { name, email, password, rollNumber, sectionId } = parsed.data;

  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) return errorResponse("that section doesn't exist", 404);

  const emailTaken = await prisma.user.findUnique({ where: { email } });
  if (emailTaken) return errorResponse("a user with this email already exists", 409);

  const rollTaken = await prisma.student.findUnique({ where: { rollNumber } });
  if (rollTaken) return errorResponse("this roll number is already in use", 409);

  const passwordHash = await hashPassword(password);

  const student = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name, email, passwordHash, role: "STUDENT" },
    });

    const newStudent = await tx.student.create({
      data: { userId: newUser.id, rollNumber, sectionId },
      include: {
        user: { select: { name: true, email: true } },
        section: { select: { name: true, year: true } },
      },
    });

    // Automatically enroll the new student in every subject already assigned
    // to the student's section. This keeps attendance eligibility in sync.
    const assignments = await tx.subjectSection.findMany({
      where: { sectionId },
      select: { id: true },
    });

    if (assignments.length > 0) {
      await tx.enrollment.createMany({
        data: assignments.map((assignment) => ({
          studentId: newStudent.id,
          subjectSectionId: assignment.id,
        })),
        skipDuplicates: true,
      });
    }

    return newStudent;
  });

  return NextResponse.json(student, { status: 201 });
}
