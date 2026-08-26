//
// Creating a session is a single insert (no transaction needed here - unlike
// teacher/student account creation, this only touches one table), but the
// ownership check below is the important part: a teacher can only start a
// session for a subject-section THEY are assigned to teach.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { createSessionSchema } from "@/lib/validations/attendance";
import { generateQrToken, generateQrDataUrl, getQrExpiryDate, getQrIssuedAt } from "@/lib/qr";

// POST /api/teacher/sessions  - start a new attendance session, generates the QR
export async function POST(req: NextRequest) {
    const user = await requireRole(["TEACHER"]);
    if (isErrorResponse(user)) return user;

  const body = await req.json();
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
  const { subjectSectionId, sessionDate } = parsed.data;
  
  const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId } });
  if (!teacher) return errorResponse("teacher profile not found", 404);
  
  const subjectSection = await prisma.subjectSection.findUnique({
      where: { id: subjectSectionId },
    });
    if (!subjectSection) return errorResponse("subject-section not found", 404);
    
    // the ownership check - this is what stops a teacher from generating a
    // QR for a class that isn't theirs
    if (subjectSection.teacherId !== teacher.id) {
        return errorResponse("you don't teach this subject-section", 403);
    }

    const qrToken = generateQrToken();
    const expiresAt = getQrExpiryDate();
    
    const session = await prisma.attendanceSession.create({
    data: {
      subjectSectionId,
      createdByTeacherId: teacher.id,
      sessionDate: sessionDate || new Date(),
      qrToken,
      expiresAt,
    },
});

const qrCodeDataUrl = await generateQrDataUrl(qrToken);

return NextResponse.json(
  { ...session, qrCodeDataUrl, qrIssuedAt: getQrIssuedAt(session.expiresAt) },
  { status: 201 }
);
}

// GET  /api/teacher/sessions  - list sessions this teacher has created
export async function GET(req: NextRequest) {
  const user = await requireRole(["TEACHER"]);
  if (isErrorResponse(user)) return user;

  const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId } });
  if (!teacher) return errorResponse("teacher profile not found", 404);

  const subjectSectionId = req.nextUrl.searchParams.get("subjectSectionId");

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      createdByTeacherId: teacher.id,
      ...(subjectSectionId ? { subjectSectionId } : {}),
    },
    include: {
      subjectSection: {
        include: {
          subject: { select: { name: true, code: true } },
          section: { select: { name: true, year: true } },
        },
      },
      _count: { select: { records: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: sessions });
}
