// Next.js 16 renamed middleware.ts -> proxy.ts (same mechanism, new name +
// exported function name). It now runs on the Node.js runtime, not Edge -
// which actually doesn't affect us since `jose` (used in auth.ts) works
// fine on Node too, we just no longer need to worry about edge-only limits.
//
// This is the FIRST line of defense: keeps people off pages they shouldn't
// even see. It is NOT the only defense, and per Next.js's own guidance,
// proxy.ts should only be used for lightweight/optimistic checks, not as
// a full authorization system - so every API route still checks the role
// again with requireRole(). That's the real security boundary. This file
// just improves UX by redirecting early, and can be bypassed by anyone
// hitting the API directly - which is exactly why requireRole() exists too.

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

const roleHomePage: Record<string, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("session_token")?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isAuthPage = pathname === "/login";
  const isProtectedPage =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/student");

  // not logged in and trying to reach a protected page -> bounce to login
  if (isProtectedPage && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // already logged in and hitting /login -> send them to their own dashboard
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL(roleHomePage[session.role], req.url));
  }

  // logged in, but trying to reach a dashboard that isn't theirs
  // e.g. a STUDENT typing /admin/students directly into the url bar
  if (isProtectedPage && session && !pathname.startsWith(roleHomePage[session.role])) {
    return NextResponse.redirect(new URL(roleHomePage[session.role], req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/login"],
};