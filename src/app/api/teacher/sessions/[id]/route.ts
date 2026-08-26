
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { generateQrDataUrl, getQrIssuedAt } from "@/lib/qr";

async function getOwnedSession(sessionId: string, userId: string) {
  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) return { error: errorResponse("teacher profile not found", 404) };
  
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      subjectSection: {
        include: {
          subject: { select: { name: true, code: true } },
          section: { select: { name: true, year: true } },
        },
      },
      _count: { select: { records: true } },
    },
  });
  if (!session) return { error: errorResponse("session not found", 404) };
  
  if (session.createdByTeacherId !== teacher.id) {
    return { error: errorResponse("this isn't your session", 403) };
  }
  
  return { session };
}

// GET   /api/teacher/sessions/:id  - session detail + who's scanned in so far
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["TEACHER"]);
  if (isErrorResponse(user)) return user;
  
  const { id } = await params;
  const { session, error } = await getOwnedSession(id, user.userId);
  if (error) return error;
  
  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId: id },
    include: { student: { include: { user: { select: { name: true } } } } },
    orderBy: { markedAt: "asc" },
  });

  // regenerated on demand rather than stored - it's cheap, and this way
  // there's never a stale image sitting somewhere out of sync with the token
  const qrCodeDataUrl = session!.isActive ? await generateQrDataUrl(session!.qrToken) : null;

  return NextResponse.json({
    ...session,
    qrCodeDataUrl,
    qrIssuedAt: session!.isActive ? getQrIssuedAt(session!.expiresAt) : null,
    records,
  });
}

// PATCH /api/teacher/sessions/:id  - close the session early (before natural expiry)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["TEACHER"]);
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const { error } = await getOwnedSession(id, user.userId);
  if (error) return error;

  const updated = await prisma.attendanceSession.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json(updated);
}
