import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isErrorResponse, errorResponse } from "@/lib/api-helpers";
import {
  generateQrDataUrl,
  generateQrToken,
  getQrExpiryDate,
  getQrIssuedAt,
} from "@/lib/qr";

// GET /api/student/attendance/active
// Only returns active sessions for subject-sections the logged-in student is
// actually enrolled in. The QR image is generated from the current token on
// demand, so students always receive the latest QR after a teacher-side refresh.
export async function GET() {
  const user = await requireRole(["STUDENT"]);
  if (isErrorResponse(user)) return user;

  const student = await prisma.student.findUnique({
    where: { userId: user.userId },
    include: {
      enrollments: {
        select: { subjectSectionId: true },
      },
    },
  });

  if (!student) return errorResponse("student profile not found", 404);

  const subjectSectionIds = student.enrollments.map((enrollment) => enrollment.subjectSectionId);

  if (subjectSectionIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      isActive: true,
      subjectSectionId: { in: subjectSectionIds },
    },
    include: {
      subjectSection: {
        include: {
          subject: { select: { name: true, code: true } },
          section: { select: { name: true, year: true } },
          teacher: {
            include: {
              user: { select: { name: true } },
            },
          },
        },
      },
      records: {
        where: { studentId: student.id },
        select: { id: true, markedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Lazy server-side rotation: if the teacher logged out, the session still
  // survives. The next enrolled student opening this page causes an expired
  // QR window to rotate, so rotation is no longer dependent on the teacher's
  // browser staying open.
  const now = new Date();
  const rotatedSessions = await Promise.all(
    sessions.map(async (session) => {
      if (session.expiresAt > now) return session;

      return prisma.attendanceSession.update({
        where: { id: session.id },
        data: {
          qrToken: generateQrToken(),
          expiresAt: getQrExpiryDate(),
        },
        include: {
          subjectSection: {
            include: {
              subject: { select: { name: true, code: true } },
              section: { select: { name: true, year: true } },
              teacher: {
                include: {
                  user: { select: { name: true } },
                },
              },
            },
          },
          records: {
            where: { studentId: student.id },
            select: { id: true, markedAt: true },
          },
        },
      });
    })
  );

  const data = await Promise.all(
    rotatedSessions.map(async (session) => ({
      id: session.id,
      sessionDate: session.sessionDate,
      expiresAt: session.expiresAt,
      qrToken: session.qrToken,
      qrCodeDataUrl: await generateQrDataUrl(session.qrToken),
      qrIssuedAt: getQrIssuedAt(session.expiresAt),
      alreadyMarked: session.records.length > 0,
      markedAt: session.records[0]?.markedAt ?? null,
      subjectSection: {
        subject: session.subjectSection.subject,
        section: session.subjectSection.section,
        teacherName: session.subjectSection.teacher.user.name,
      },
    }))
  );

  return NextResponse.json({ data });
}
