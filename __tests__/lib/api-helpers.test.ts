// Unit tests for the requireAuth/requireRole guards every protected API
// route relies on. `getCurrentUser` itself touches next/headers cookies,
// so it's mocked here - these tests are purely about the permission logic.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SessionPayload } from "@/lib/auth";

const { getCurrentUser } = vi.hoisted(() => ({
  getCurrentUser: vi.fn<() => Promise<SessionPayload | null>>(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser }));

const { requireAuth, requireRole, isErrorResponse, errorResponse } = await import(
  "@/lib/api-helpers"
);

function makeUser(role: SessionPayload["role"]): SessionPayload {
  return { userId: "u1", role, email: "u1@example.com", name: "Test User" };
}

beforeEach(() => {
  getCurrentUser.mockReset();
});

describe("errorResponse", () => {
  it("builds a JSON response with the given status and message", async () => {
    const res = errorResponse("nope", 403);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "nope" });
  });
});

describe("isErrorResponse", () => {
  it("identifies a NextResponse as an error response", () => {
    expect(isErrorResponse(errorResponse("x", 400))).toBe(true);
  });

  it("does not treat a session payload as an error response", () => {
    expect(isErrorResponse(makeUser("ADMIN"))).toBe(false);
  });
});

describe("requireAuth", () => {
  it("returns the user when a session exists", async () => {
    const user = makeUser("TEACHER");
    getCurrentUser.mockResolvedValue(user);

    const result = await requireAuth();
    expect(result).toEqual(user);
  });

  it("returns a 401 when there is no session", async () => {
    getCurrentUser.mockResolvedValue(null);

    const result = await requireAuth();
    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) {
      expect(result.status).toBe(401);
      expect((await result.json()).error).toMatch(/not authenticated/i);
    }
  });
});

describe("requireRole", () => {
  it("allows a user whose role is in the allow-list", async () => {
    const user = makeUser("ADMIN");
    getCurrentUser.mockResolvedValue(user);

    const result = await requireRole(["ADMIN", "TEACHER"]);
    expect(result).toEqual(user);
  });

  it("rejects with 401 when nobody is logged in", async () => {
    getCurrentUser.mockResolvedValue(null);

    const result = await requireRole(["ADMIN"]);
    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) expect(result.status).toBe(401);
  });

  it("rejects with 403 when the role isn't allowed (the mark-attendance-page bug)", async () => {
    // This is exactly the case behind the 403s on /api/admin/sections and
    // /api/admin/students: a logged-in user whose role isn't ADMIN/TEACHER.
    const user = makeUser("STUDENT");
    getCurrentUser.mockResolvedValue(user);

    const result = await requireRole(["ADMIN", "TEACHER"]);
    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) {
      expect(result.status).toBe(403);
      expect((await result.json()).error).toMatch(/don't have permission/i);
    }
  });

  it("never leaks a role check across roles it wasn't given", async () => {
    const user = makeUser("TEACHER");
    getCurrentUser.mockResolvedValue(user);

    const result = await requireRole(["STUDENT"]);
    expect(isErrorResponse(result)).toBe(true);
  });
});
