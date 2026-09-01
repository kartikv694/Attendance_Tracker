// Unit tests for auth.ts functions using vitest

import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth";

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

describe("Session tokens", () => {
  const samplePayload: SessionPayload = {
    userId: "user_123",
    role: "STUDENT",
    email: "student@example.com",
    name: "Aarav Sharma",
  };

  it("should sign a token and verify it back to the original payload", async () => {
    const token = await signSessionToken(samplePayload);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // header.payload.signature

    const verified = await verifySessionToken(token);
    expect(verified).toMatchObject(samplePayload);
  });

  it("should return null for a tampered token", async () => {
    const token = await signSessionToken(samplePayload);
    const tampered = token.slice(0, -2) + (token.slice(-2) === "aa" ? "bb" : "aa");

    const verified = await verifySessionToken(tampered);
    expect(verified).toBeNull();
  });

  it("should return null for garbage input", async () => {
    const verified = await verifySessionToken("not-a-real-token");
    expect(verified).toBeNull();
  });
});
