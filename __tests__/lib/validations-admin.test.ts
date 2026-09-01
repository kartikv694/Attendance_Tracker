import { describe, it, expect } from "vitest";
import {
  createSectionSchema,
  createSubjectSchema,
  createTeacherSchema,
  createStudentSchema,
  assignSubjectSectionSchema,
  assignClassTeacherSchema,
  createEnrollmentSchema,
  createTimetableSlotSchema,
  paginationSchema,
} from "@/lib/validations/admin";

const CUID = "clh3b1s0v0000qzrmn831i7rn";

describe("createSectionSchema", () => {
  it("accepts a valid section", () => {
    const result = createSectionSchema.safeParse({ name: "CSE-3A", year: 2024 });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createSectionSchema.safeParse({ name: "", year: 2024 });
    expect(result.success).toBe(false);
  });

  it("rejects a year outside the supported range", () => {
    expect(createSectionSchema.safeParse({ name: "A", year: 1999 }).success).toBe(false);
    expect(createSectionSchema.safeParse({ name: "A", year: 2101 }).success).toBe(false);
  });
});

describe("createSubjectSchema", () => {
  it("requires both name and code", () => {
    expect(createSubjectSchema.safeParse({ name: "DBMS", code: "CS301" }).success).toBe(true);
    expect(createSubjectSchema.safeParse({ name: "", code: "CS301" }).success).toBe(false);
    expect(createSubjectSchema.safeParse({ name: "DBMS", code: "" }).success).toBe(false);
  });
});

describe("createTeacherSchema", () => {
  it("accepts a valid teacher", () => {
    const result = createTeacherSchema.safeParse({
      name: "Ms. Rao",
      email: "rao@college.edu",
      password: "secret1",
      employeeCode: "EMP001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a short password and a bad email", () => {
    expect(
      createTeacherSchema.safeParse({
        name: "Ms. Rao",
        email: "rao@college.edu",
        password: "abc",
        employeeCode: "EMP001",
      }).success
    ).toBe(false);

    expect(
      createTeacherSchema.safeParse({
        name: "Ms. Rao",
        email: "not-an-email",
        password: "secret1",
        employeeCode: "EMP001",
      }).success
    ).toBe(false);
  });
});

describe("createStudentSchema", () => {
  it("accepts a valid student with a cuid sectionId", () => {
    const result = createStudentSchema.safeParse({
      name: "Aarav Sharma",
      email: "aarav@college.edu",
      password: "secret1",
      rollNumber: "R001",
      sectionId: CUID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-cuid sectionId", () => {
    const result = createStudentSchema.safeParse({
      name: "Aarav Sharma",
      email: "aarav@college.edu",
      password: "secret1",
      rollNumber: "R001",
      sectionId: "not-a-cuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("assignment schemas", () => {
  it("assignSubjectSectionSchema requires three cuids", () => {
    const result = assignSubjectSectionSchema.safeParse({
      subjectId: CUID,
      sectionId: CUID,
      teacherId: CUID,
    });
    expect(result.success).toBe(true);
  });

  it("assignClassTeacherSchema requires a sectionId", () => {
    expect(assignClassTeacherSchema.safeParse({ sectionId: CUID }).success).toBe(true);
    expect(assignClassTeacherSchema.safeParse({}).success).toBe(false);
  });

  it("createEnrollmentSchema requires studentId and subjectSectionId", () => {
    const result = createEnrollmentSchema.safeParse({
      studentId: CUID,
      subjectSectionId: CUID,
    });
    expect(result.success).toBe(true);
  });
});

describe("createTimetableSlotSchema", () => {
  const base = { subjectSectionId: CUID, dayOfWeek: "MONDAY" as const };

  it("accepts a valid slot where end is after start", () => {
    const result = createTimetableSlotSchema.safeParse({
      ...base,
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a slot where end is not after start", () => {
    const result = createTimetableSlotSchema.safeParse({
      ...base,
      startTime: "10:00",
      endTime: "09:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed time string", () => {
    const result = createTimetableSlotSchema.safeParse({
      ...base,
      startTime: "9am",
      endTime: "10:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid day of week", () => {
    const result = createTimetableSlotSchema.safeParse({
      ...base,
      dayOfWeek: "SATURDAY",
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(result.success).toBe(false);
  });
});

describe("paginationSchema (re-exported)", () => {
  it("defaults page and pageSize when omitted", () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ page: 1, pageSize: 8 });
    }
  });

  it("coerces string query params into numbers", () => {
    const result = paginationSchema.safeParse({ page: "2", pageSize: "50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ page: 2, pageSize: 50 });
    }
  });

  it("rejects a pageSize above 100", () => {
    expect(paginationSchema.safeParse({ pageSize: "101" }).success).toBe(false);
  });
});
