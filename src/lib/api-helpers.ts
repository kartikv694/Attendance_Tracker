// Small shared helpers so every API route doesn't reinvent the same
// "check who's logged in" / "return a consistent error shape" logic.

import { NextResponse } from "next/server";
import { getCurrentUser, type SessionPayload } from "@/lib/auth";
import type { Role } from "@/generated/prisma/client";

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// use at the top of any route that just needs "someone logged in"
export async function requireAuth(): Promise<SessionPayload | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return errorResponse("not authenticated", 401);
  return user;
}

// use when a route is restricted to specific roles, e.g. requireRole(["ADMIN"])
export async function requireRole(allowedRoles: Role[]): Promise<SessionPayload | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return errorResponse("not authenticated", 401);
  if (!allowedRoles.includes(user.role)) {
    return errorResponse("you don't have permission to do this", 403);
  }
  return user;
}

// tiny type guard so routes can tell "did requireRole give me a user, or an error response"
export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
