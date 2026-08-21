// Creating a teacher touches two tables (User for login, Teacher for the
// profile) so this runs inside a transaction - if either insert fails,
// both roll back. Without this you could end up with a User row that has
// no matching Teacher profile, which would break login for that account.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { createTeacherSchema, paginationSchema } from "@/lib/validations/admin";

// GET  /api/admin/teachers  - list all teachers (paginated)
export async function GET(req: NextRequest) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const query = paginationSchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
);
  if (!query.success) return errorResponse("invalid pagination params", 400);
  const { page, pageSize } = query.data;

  const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.teacher.count(),
    ]);
    
    return NextResponse.json({
        data: teachers,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
}

// POST /api/admin/teachers  - create a new teacher account
export async function POST(req: NextRequest) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const body = await req.json();
  const parsed = createTeacherSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
  const { name, email, password, employeeCode } = parsed.data;

  const emailTaken = await prisma.user.findUnique({ where: { email } });
  if (emailTaken) return errorResponse("a user with this email already exists", 409);

  const codeTaken = await prisma.teacher.findUnique({ where: { employeeCode } });
  if (codeTaken) return errorResponse("this employee code is already in use", 409);

  const passwordHash = await hashPassword(password);

  // both inserts succeed together or not at all
  const teacher = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name, email, passwordHash, role: "TEACHER" },
    });

    return tx.teacher.create({
      data: { userId: newUser.id, employeeCode },
      include: { user: { select: { name: true, email: true } } },
    });
  });

  return NextResponse.json(teacher, { status: 201 });
}
