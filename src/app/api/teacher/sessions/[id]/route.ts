
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
//
// Closing is also the moment every still-missing enrolled student gets
// swept into an ABSENT record: while the session was open they showed up
// as "PENDING" in the live view (see /:id/live), but once the class is
// over there's no more chance for them to scan in, so "never marked"
// becomes a real ABSENT row. Each of those auto-marks gets its own audit
// log entry (previousStatus: null) so the trail shows it was a
// session-close sweep rather than a one-off manual edit, attributed to
// the teacher who closed the session.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["TEACHER"]);
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const { session, error } = await getOwnedSession(id, user.userId);
  if (error) return error;

  if (!session!.isActive) {
    return errorResponse("this session is already closed", 409);
  }

  const [enrollments, existingRecords] = await Promise.all([
    prisma.enrollment.findMany({
      where: { subjectSectionId: session!.subjectSectionId },
      select: { studentId: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { sessionId: id },
      select: { studentId: true },
    }),
  ]);

  const alreadyMarked = new Set(existingRecords.map((r) => r.studentId));
  const missingStudentIds = enrollments
    .map((e) => e.studentId)
    .filter((studentId) => !alreadyMarked.has(studentId));

  const [updated] = await prisma.$transaction([
    prisma.attendanceSession.update({
      where: { id },
      data: { isActive: false },
    }),
    ...missingStudentIds.map((studentId) =>
      prisma.attendanceRecord.create({
        data: { sessionId: id, studentId, status: "ABSENT", markedVia: "MANUAL" },
      })
    ),
  ]);

  // audit entries reference the just-created record ids, so they're
  // written as a follow-up step once those ids exist rather than being
  // folded into the transaction above
  if (missingStudentIds.length > 0) {
    const newRecords = await prisma.attendanceRecord.findMany({
      where: { sessionId: id, studentId: { in: missingStudentIds } },
      select: { id: true },
    });
    await prisma.attendanceAuditLog.createMany({
      data: newRecords.map((r) => ({
        attendanceRecordId: r.id,
        changedByUserId: user.userId,
        previousStatus: null,
        newStatus: "ABSENT" as const,
        reason: "Auto-marked absent: session closed without attendance",
      })),
    });
  }

  return NextResponse.json(updated);
}
