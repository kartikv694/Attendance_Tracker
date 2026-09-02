import { describe, it, expect } from "vitest";
import { generateStudentPassword } from "@/lib/student-password";
import { hashPassword, verifyPassword } from "@/lib/auth";

describe("generateStudentPassword", () => {
  it("uses the student's first name", () => {
    expect(generateStudentPassword("Kartik Verma")).toBe("Kartik@1234");
  });

  it("uses only the first name when multiple names are provided", () => {
    expect(generateStudentPassword("Aarav Kumar Sharma")).toBe("Aarav@1234");
  });

  it("trims leading and trailing whitespace", () => {
    expect(generateStudentPassword("  Priya Singh  ")).toBe("Priya@1234");
  });

  it("preserves the first-name casing", () => {
    expect(generateStudentPassword("RAHUL Sharma")).toBe("RAHUL@1234");
  });

  it("rejects an empty student name", () => {
    expect(() => generateStudentPassword("   ")).toThrow("Student name is required");
  });
});

describe("student default password", () => {
  it("can be hashed and verified with the generated password", async () => {
    const password = generateStudentPassword("Kartik Verma");
    const hash = await hashPassword(password);

    expect(await verifyPassword("Kartik@1234", hash)).toBe(true);
    expect(await verifyPassword("Kartik@12345", hash)).toBe(false);
  });
});
