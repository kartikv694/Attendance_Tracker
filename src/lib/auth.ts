// Using `jose` instead of the older `jsonwebtoken` package on purpose:
// jsonwebtoken relies on Node's crypto module directly, which breaks if this
// ever runs in Next.js middleware (Edge runtime). jose works in both.

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import type { Role } from "@/generated/prisma/client";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = "session_token";

// what we actually store inside the JWT - kept minimal on purpose.
// don't put anything sensitive here, it's readable (not encrypted, only signed)
export type SessionPayload = {
  userId: string;
  role: Role;
  email: string;
  name: string;
};

// ---------- password hashing ----------

export async function hashPassword(plainPassword: string){
  // 10 salt rounds is a reasonable default - enough cost to slow down
  // brute force, not so much it noticeably slows down login
  return bcrypt.hash(plainPassword, 10);
}

export async function verifyPassword(plainPassword: string, hash: string) {
  return bcrypt.compare(plainPassword, hash);
}

// ---------- token sign / verify ----------

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || "7d")
    .sign(JWT_SECRET);
}

// returns null instead of throwing if the token is missing/expired/tampered -
// callers just treat null as "not logged in"
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ---------- cookie helpers (App Router server-side only) ----------

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true, // JS on the page can't read this - blocks XSS token theft
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    sameSite: "lax", // decent CSRF protection while still allowing normal navigation
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days, in seconds
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// the function every protected API route / server component will call
// to find out "who is making this request"
//
// Checks the Authorization header first, then falls back to the shared
// session cookie. The header is what makes multi-tab sessions work: each
// browser tab keeps its own JWT in sessionStorage and sends it as
// `Authorization: Bearer <token>` on every request (see session-fetch.ts),
// so two tabs with two different logged-in users each get their own
// identity here, even though they share one browser and one cookie jar.
// The cookie fallback exists for requests that can't carry a custom
// header - e.g. a plain browser navigation triggered by clicking a link -
// where it still reflects whichever account most recently logged in.
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const headerList = await headers();
  const authHeader = headerList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice("Bearer ".length);
    const bearerUser = await verifySessionToken(bearerToken);
    if (bearerUser) return bearerUser;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
