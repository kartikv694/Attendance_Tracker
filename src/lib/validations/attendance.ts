// Zod schemas for the attendance flow: creating sessions, scanning QR
// codes, and manual teacher overrides.

import { z } from "zod";

export const createSessionSchema = z.object({
  subjectSectionId: z.string().cuid(),
  // defaults to now if not given - lets a teacher backdate for an earlier
  // period on the same day if needed, without forcing it on every request
  sessionDate: z.coerce.date().optional(),
});

export const scanAttendanceSchema = z.object({
  qrToken: z.string().min(1, "qr token is required"),
});

export const manualMarkSchema = z.object({
  sessionId: z.string().cuid(),
  studentId: z.string().cuid(),
  status: z.enum(["PRESENT", "ABSENT", "LATE"]),
  reason: z.string().optional(),
});

export const updateAttendanceSchema = z.object({
  status: z.enum(["PRESENT", "ABSENT", "LATE"]),
  reason: z.string().optional(),
});
