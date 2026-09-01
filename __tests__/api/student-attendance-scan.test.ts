// Integration tests for POST /api/student/attendance/scan - the single most
// important route in the app. Prisma and the auth layer are mocked so these
// run without a real database, but the route's own logic (the three rules
// described at the top of the route file) runs for real.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { SessionPayload } from "@/lib/auth";

const { getCurrentUser } = vi.hoisted(() => ({
  getCurrentUser: vi.fn<() => Promise<SessionPayload | null>>(),
}));
vi.mock("@/lib/auth", () => ({ getCurrentUser }));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    attendanceSession: { findUnique: vi.fn() },
    student: { findUnique: vi.fn() },
    enrollment: { findUnique: vi.fn() },
    attendanceRecord: { findUnique: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { POST } = await import("@/app/api/student/attendance/scan/route");

const STUDENT_USER: SessionPayload = {
  userId: "user_student_1",
  role: "STUDENT",
  email: "student@example.com",
  name: "Aarav Sharma",
};

function scanRequest(body: unknown) {
  return new NextRequest("http://localhost/api/student/attendance/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/student/attendance/scan", () => {
  it("rejects non-student roles with 403", async () => {
    getCurrentUser.mockResolvedValue({ ...STUDENT_USER, role: "TEACHER" });

    const res = await POST(scanRequest({ qrToken: "abc" }));
    expect(res.status).toBe(403);
  });

  it("rejects a missing/blank qrToken with 400 before touching the DB", async () => {
    getCurrentUser.mockResolvedValue(STUDENT_USER);

    const res = await POST(scanRequest({ qrToken: "" }));
    expect(res.status).toBe(400);
    expect(prismaMock.attendanceSession.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 for a qrToken that matches no session", async () => {
    getCurrentUser.mockResolvedValue(STUDENT_USER);
    prismaMock.attendanceSession.findUnique.mockResolvedValue(null);

    const res = await POST(scanRequest({ qrToken: "unknown-token" }));
    expect(res.status).toBe(404);
  });

  it("returns 410 when the session has been closed by the teacher", async () => {
    getCurrentUser.mockResolvedValue(STUDENT_USER);
    prismaMock.attendanceSession.findUnique.mockResolvedValue({
      id: "session_1",
      subjectSectionId: "ss_1",
      isActive: false,
    });

    const res = await POST(scanRequest({ qrToken: "closed-token" }));
    expect(res.status).toBe(410);
  });

  it("returns 404 when the logged-in user has no student profile", async () => {
    getCurrentUser.mockResolvedValue(STUDENT_USER);
    prismaMock.attendanceSession.findUnique.mockResolvedValue({
      id: "session_1",
      subjectSectionId: "ss_1",
      isActive: true,
    });
    prismaMock.student.findUnique.mockResolvedValue(null);

    const res = await POST(scanRequest({ qrToken: "valid-token" }));
    expect(res.status).toBe(404);
  });

  it("returns 403 when the student is not enrolled in the session's subject-section", async () => {
    getCurrentUser.mockResolvedValue(STUDENT_USER);
    prismaMock.attendanceSession.findUnique.mockResolvedValue({
      id: "session_1",
      subjectSectionId: "ss_1",
      isActive: true,
    });
    prismaMock.student.findUnique.mockResolvedValue({ id: "student_1" });
    prismaMock.enrollment.findUnique.mockResolvedValue(null);

    const res = await POST(scanRequest({ qrToken: "valid-token" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/not enrolled/i);
  });

  it("returns 409 when the pre-check finds an existing record for this session", async () => {
    getCurrentUser.mockResolvedValue(STUDENT_USER);
    prismaMock.attendanceSession.findUnique.mockResolvedValue({
      id: "session_1",
      subjectSectionId: "ss_1",
      isActive: true,
    });
    prismaMock.student.findUnique.mockResolvedValue({ id: "student_1" });
    prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enrollment_1" });
    prismaMock.attendanceRecord.findUnique.mockResolvedValue({ id: "existing_record" });

    const res = await POST(scanRequest({ qrToken: "valid-token" }));
    expect(res.status).toBe(409);
    expect(prismaMock.attendanceRecord.create).not.toHaveBeenCalled();
  });

  it("marks the student present (201) when every rule passes", async () => {
    getCurrentUser.mockResolvedValue(STUDENT_USER);
    prismaMock.attendanceSession.findUnique.mockResolvedValue({
      id: "session_1",
      subjectSectionId: "ss_1",
      isActive: true,
    });
    prismaMock.student.findUnique.mockResolvedValue({ id: "student_1" });
    prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enrollment_1" });
    prismaMock.attendanceRecord.findUnique.mockResolvedValue(null);
    prismaMock.attendanceRecord.create.mockResolvedValue({
      id: "record_1",
      sessionId: "session_1",
      studentId: "student_1",
      status: "PRESENT",
      markedVia: "QR",
    });

    const res = await POST(scanRequest({ qrToken: "valid-token" }));
    expect(res.status).toBe(201);
    expect(prismaMock.attendanceRecord.create).toHaveBeenCalledWith({
      data: {
        sessionId: "session_1",
        studentId: "student_1",
        status: "PRESENT",
        markedVia: "QR",
      },
    });
  });

  it("falls back to 409 on a P2002 race instead of a 500 (double-tap / concurrent scan)", async () => {
    const { Prisma } = await import("@/generated/prisma/client");

    getCurrentUser.mockResolvedValue(STUDENT_USER);
    prismaMock.attendanceSession.findUnique.mockResolvedValue({
      id: "session_1",
      subjectSectionId: "ss_1",
      isActive: true,
    });
    prismaMock.student.findUnique.mockResolvedValue({ id: "student_1" });
    prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enrollment_1" });
    prismaMock.attendanceRecord.findUnique.mockResolvedValue(null); // pre-check misses the race
    prismaMock.attendanceRecord.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      })
    );

    const res = await POST(scanRequest({ qrToken: "valid-token" }));
    expect(res.status).toBe(409);
  });
});
