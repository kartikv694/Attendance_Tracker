// Unit tests for auth.ts functions using vitest

import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth";

describe("Password hashing", () => {
  it("should hash a password and produce a different value", async () => {
    const password = "MySecurePassword123";
    const hash = await hashPassword(password);

    expect(hash).not.toEqual(password);
    expect(hash.length).toBeGreaterThan(0);
  });

  it("should verify correct password", async () => {
    const password = "TestPassword456";
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);

    expect(isValid).toBe(true);
  });

  it("should reject incorrect password", async () => {
    const password = "CorrectPassword";
    const hash = await hashPassword(password);
    const isValid = await verifyPassword("WrongPassword", hash);

    expect(isValid).toBe(false);
  });

  it("should produce different hashes for same password", async () => {
    const password = "SamePassword";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toEqual(hash2);
  });
});
