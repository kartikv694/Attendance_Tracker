import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { createSubjectSchema, paginationSchema } from "@/lib/validations/admin";

// GET  /api/admin/subjects  - list all subjects (paginated)
export async function GET(req: NextRequest) {
  const user = await requireRole(["ADMIN", "TEACHER"]);
  if (isErrorResponse(user)) return user;

  const query = paginationSchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  if (!query.success) return errorResponse("invalid pagination params", 400);
  const { page, pageSize } = query.data;

  const [subjects, total] = await Promise.all([
    prisma.subject.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { name: "asc" },
    }),
    prisma.subject.count(),
  ]);
  
  return NextResponse.json({
      data: subjects,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
}

// POST /api/admin/subjects  - create a new subject
export async function POST(req: NextRequest) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const body = await req.json();
  const parsed = createSubjectSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

  const existing = await prisma.subject.findUnique({ where: { code: parsed.data.code } });
  if (existing) return errorResponse("a subject with this code already exists", 409);

  const subject = await prisma.subject.create({ data: parsed.data });
  return NextResponse.json(subject, { status: 201 });
}
