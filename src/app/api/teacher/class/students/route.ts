// The class-teacher's own roster. Deliberately its own route rather than
// reusing /api/admin/students?sectionId=... for the write side: that admin
// route lets ANY teacher POST into ANY section as long as they pass a
// sectionId, which is fine for admin-only writes but wrong here - a
// class-teacher should only ever be able to add students to the ONE
// section they're actually the class-teacher of. So this route derives the
// sectionId itself from the logged-in teacher instead of trusting the body.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { z } from "zod";

const addClassStudentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, "password must be at least 6 characters"),
  rollNumber: z.string().min(1),
});

async function getOwnClassSection(userId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    include: { classSection: true },
  });
  if (!teacher) return { error: errorResponse("teacher profile not found", 404) };
  if (!teacher.classSection) {
    return { error: errorResponse("you're not the class-teacher of any section", 403) };
  }
  return { section: teacher.classSection };
}

// GET /api/teacher/class/students - roster of the teacher's own class section
export async function GET() {
  const user = await requireRole(["TEACHER"]);
  if (isErrorResponse(user)) return user;

  const { section, error } = await getOwnClassSection(user.userId);
  if (error) return error;

  const students = await prisma.student.findMany({
    where: { sectionId: section!.id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { rollNumber: "asc" },
  });

  return NextResponse.json({ section, data: students });
}

// POST /api/teacher/class/students - add a student directly into that section
export async function POST(req: NextRequest) {
  const user = await requireRole(["TEACHER"]);
  if (isErrorResponse(user)) return user;

  const { section, error } = await getOwnClassSection(user.userId);
  if (error) return error;

  const body = await req.json();
  const parsed = addClassStudentSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
  const { name, email, password, rollNumber } = parsed.data;

  const emailTaken = await prisma.user.findUnique({ where: { email } });
  if (emailTaken) return errorResponse("a user with this email already exists", 409);

  const rollTaken = await prisma.student.findUnique({ where: { rollNumber } });
  if (rollTaken) return errorResponse("this roll number is already in use", 409);

  const passwordHash = await hashPassword(password);

  const student = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name, email, passwordHash, role: "STUDENT" },
    });

    return tx.student.create({
      data: { userId: newUser.id, rollNumber, sectionId: section!.id },
      include: {
        user: { select: { name: true, email: true } },
        section: { select: { name: true, year: true } },
      },
    });
  });

  return NextResponse.json(student, { status: 201 });
}
