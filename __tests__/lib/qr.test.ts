import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateQrToken, getQrExpiryDate, getQrIssuedAt } from "@/lib/qr";

describe("generateQrToken", () => {
  it("returns a 48-char hex string (24 random bytes)", () => {
    const token = generateQrToken();
    expect(token).toMatch(/^[0-9a-f]{48}$/);
  });

  it("produces a different token on every call", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateQrToken()));
    expect(tokens.size).toBe(20);
  });
});

describe("QR expiry timing", () => {
  const originalEnv = process.env.QR_EXPIRY_SECONDS;

  beforeEach(() => {
    process.env.QR_EXPIRY_SECONDS = "60";
  });

  afterEach(() => {
    process.env.QR_EXPIRY_SECONDS = originalEnv;
  });

  it("getQrExpiryDate is QR_EXPIRY_SECONDS in the future", () => {
    const before = Date.now();
    const expiry = getQrExpiryDate();
    const after = Date.now();

    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + 60_000);
    expect(expiry.getTime()).toBeLessThanOrEqual(after + 60_000);
  });

  it("falls back to 10 seconds when QR_EXPIRY_SECONDS is unset/invalid", () => {
    process.env.QR_EXPIRY_SECONDS = "not-a-number";
    const before = Date.now();
    const expiry = getQrExpiryDate();
    expect(expiry.getTime()).toBeLessThanOrEqual(before + 10_000 + 50);
  });

  it("getQrIssuedAt is the inverse of getQrExpiryDate", () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const issuedAt = getQrIssuedAt(expiresAt);
    expect(expiresAt.getTime() - issuedAt.getTime()).toBe(60_000);
  });
});
