// Admin only.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { createSectionSchema, paginationSchema } from "@/lib/validations/admin";

// GET  /api/admin/sections  - list all sections (paginated)
export async function GET(req: NextRequest) {
  const user = await requireRole(["ADMIN", "TEACHER"]); // teachers need this list too, e.g. when assigning subjects
  if (isErrorResponse(user)) return user;

  const query = paginationSchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  if (!query.success) return errorResponse("invalid pagination params", 400);
  const { page, pageSize } = query.data;

  const [sections, total] = await Promise.all([
    prisma.section.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ year: "desc" }, { name: "asc" }],
      include: { _count: { select: { students: true } } },
    }),
    prisma.section.count(),
  ]);
  
  return NextResponse.json({
      data: sections,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
}

// POST /api/admin/sections  - create a new section
export async function POST(req: NextRequest) {
  const user = await requireRole(["ADMIN"]);
  if (isErrorResponse(user)) return user;

  const body = await req.json();
  const parsed = createSectionSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

  const existing = await prisma.section.findFirst({
    where: { name: parsed.data.name, year: parsed.data.year },
  });
  if (existing) return errorResponse("a section with this name and year already exists", 409);

  const section = await prisma.section.create({ data: parsed.data });
  return NextResponse.json(section, { status: 201 });
}
