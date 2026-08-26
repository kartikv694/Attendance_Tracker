// POST /api/teacher/sessions/:id/refresh
//
// Regenerates the QR token and expiry on an ALREADY-ACTIVE session,
// without touching any of its existing attendance records. This is what
// powers the auto-refreshing QR: the frontend calls this every time the
// current QR is about to expire, and keeps doing so on a loop until the
// teacher actually ends the session (PATCH on the parent route) - at
// which point isActive flips to false and this route starts rejecting.
//
// Old tokens are simply abandoned once replaced - the unique constraint
// on qrToken means the old one still technically exists in the DB row
// history is overwritten here (not kept), but since a scan only ever
// checks the CURRENT token on the session, an old token is immediately
// worthless the moment this runs.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import { generateQrToken, generateQrDataUrl, getQrExpiryDate, getQrIssuedAt } from "@/lib/qr";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["TEACHER"]);
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId } });
  if (!teacher) return errorResponse("teacher profile not found", 404);

  const session = await prisma.attendanceSession.findUnique({ where: { id } });
  if (!session) return errorResponse("session not found", 404);
  if (session.createdByTeacherId !== teacher.id) {
    return errorResponse("this isn't your session", 403);
  }
  if (!session.isActive) {
    return errorResponse("this session has been closed - can't refresh its QR", 409);
  }

  const qrToken = generateQrToken();
  const expiresAt = getQrExpiryDate();

  const updated = await prisma.attendanceSession.update({
    where: { id },
    data: { qrToken, expiresAt },
  });

  const qrCodeDataUrl = await generateQrDataUrl(qrToken);

  return NextResponse.json({
    ...updated,
    qrCodeDataUrl,
    qrIssuedAt: getQrIssuedAt(updated.expiresAt),
  });
}
