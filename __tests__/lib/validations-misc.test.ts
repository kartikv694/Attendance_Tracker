import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerAdminSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyResetCodeSchema,
} from "@/lib/validations/auth";
import { paginationSchema, dateRangeSchema } from "@/lib/validations/common";
import { exportFormatSchema } from "@/lib/validations/export";
import {
  studentHistoryFilterSchema,
  teacherReportFilterSchema,
  adminReportFilterSchema,
  auditLogFilterSchema,
} from "@/lib/validations/reports";

const CUID = "clh3b1s0v0000qzrmn831i7rn";

describe("auth schemas", () => {
  it("loginSchema requires a valid email and a non-empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });

  it("registerAdminSchema enforces a minimum password length", () => {
    expect(
      registerAdminSchema.safeParse({ name: "Admin", email: "a@b.com", password: "abcdef" })
        .success
    ).toBe(true);
    expect(
      registerAdminSchema.safeParse({ name: "Admin", email: "a@b.com", password: "abc" }).success
    ).toBe(false);
  });

  it("forgotPasswordSchema only needs an email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });

  it("resetPasswordSchema requires a 6-digit code and new password", () => {
    expect(
      resetPasswordSchema.safeParse({ email: "a@b.com", code: "123456", newPassword: "abcdef" })
        .success
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({ email: "a@b.com", code: "12345", newPassword: "abcdef" })
        .success
    ).toBe(false);
  });

  it("verifyResetCodeSchema rejects a non-numeric code", () => {
    expect(verifyResetCodeSchema.safeParse({ email: "a@b.com", code: "abcdef" }).success).toBe(
      false
    );
  });
});

describe("common schemas", () => {
  it("paginationSchema applies defaults", () => {
    const result = paginationSchema.parse({});
    expect(result).toEqual({ page: 1, pageSize: 8 });
  });

  it("dateRangeSchema allows both bounds to be omitted", () => {
    expect(dateRangeSchema.safeParse({}).success).toBe(true);
  });

  it("dateRangeSchema coerces valid date strings", () => {
    const result = dateRangeSchema.safeParse({ from: "2024-01-01", to: "2024-01-31" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.from).toBeInstanceOf(Date);
      expect(result.data.to).toBeInstanceOf(Date);
    }
  });
});

describe("exportFormatSchema", () => {
  it("accepts csv and xlsx, defaults includeAuditLog to false", () => {
    const result = exportFormatSchema.safeParse({ format: "csv" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.includeAuditLog).toBe(false);
  });

  it("rejects an unsupported format", () => {
    expect(exportFormatSchema.safeParse({ format: "pdf" }).success).toBe(false);
  });
});

describe("report filter schemas", () => {
  it("studentHistoryFilterSchema works with just pagination", () => {
    expect(studentHistoryFilterSchema.safeParse({}).success).toBe(true);
  });

  it("teacherReportFilterSchema requires a subjectSectionId", () => {
    expect(teacherReportFilterSchema.safeParse({}).success).toBe(false);
    expect(
      teacherReportFilterSchema.safeParse({ subjectSectionId: CUID }).success
    ).toBe(true);
  });

  it("adminReportFilterSchema has no required fields", () => {
    expect(adminReportFilterSchema.safeParse({}).success).toBe(true);
  });

  it("auditLogFilterSchema accepts a free-text search term", () => {
    const result = auditLogFilterSchema.safeParse({ search: "  Aarav  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.search).toBe("Aarav"); // trimmed
  });
});
