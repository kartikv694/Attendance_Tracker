import { describe, it, expect } from "vitest";
import {
  createSessionSchema,
  scanAttendanceSchema,
  manualMarkSchema,
  updateAttendanceSchema,
} from "@/lib/validations/attendance";

const CUID = "clh3b1s0v0000qzrmn831i7rn";

describe("createSessionSchema", () => {
  it("only requires subjectSectionId - sessionDate is optional", () => {
    expect(createSessionSchema.safeParse({ subjectSectionId: CUID }).success).toBe(true);
  });

  it("coerces a date string for sessionDate when provided", () => {
    const result = createSessionSchema.safeParse({
      subjectSectionId: CUID,
      sessionDate: "2024-05-01",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sessionDate).toBeInstanceOf(Date);
  });

  it("rejects a non-cuid subjectSectionId", () => {
    expect(createSessionSchema.safeParse({ subjectSectionId: "abc" }).success).toBe(false);
  });
});

describe("scanAttendanceSchema", () => {
  it("accepts any non-empty qrToken", () => {
    expect(scanAttendanceSchema.safeParse({ qrToken: "abc123" }).success).toBe(true);
  });

  it("rejects an empty qrToken", () => {
    expect(scanAttendanceSchema.safeParse({ qrToken: "" }).success).toBe(false);
  });

  it("rejects a missing qrToken", () => {
    expect(scanAttendanceSchema.safeParse({}).success).toBe(false);
  });
});

describe("manualMarkSchema", () => {
  it("accepts a valid manual mark", () => {
    const result = manualMarkSchema.safeParse({
      sessionId: CUID,
      studentId: CUID,
      status: "ABSENT",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid status", () => {
    const result = manualMarkSchema.safeParse({
      sessionId: CUID,
      studentId: CUID,
      status: "MAYBE",
    });
    expect(result.success).toBe(false);
  });

  it("allows an optional reason", () => {
    const result = manualMarkSchema.safeParse({
      sessionId: CUID,
      studentId: CUID,
      status: "LATE",
      reason: "Bus was late",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateAttendanceSchema", () => {
  it("accepts each valid status", () => {
    for (const status of ["PRESENT", "ABSENT", "LATE"]) {
      expect(updateAttendanceSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it("rejects an unknown status", () => {
    expect(updateAttendanceSchema.safeParse({ status: "EXCUSED" }).success).toBe(false);
  });
});
