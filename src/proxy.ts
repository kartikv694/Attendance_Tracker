// Next.js 16 renamed middleware.ts -> proxy.ts (same mechanism, new name +
// exported function name). It now runs on the Node.js runtime, not Edge -
// which actually doesn't affect us since `jose` (used in auth.ts) works
// fine on Node too, we just no longer need to worry about edge-only limits.
//
// This is the FIRST line of defense: keeps a browser that has never logged
// in at all off pages it shouldn't even see. It is NOT the only defense,
// and per Next.js's own guidance, proxy.ts should only be used for
// lightweight/optimistic checks, not as a full authorization system - so
// every API route still checks the role again with requireRole(). That's
// the real security boundary. This file just improves UX by redirecting
// early, and can be bypassed by anyone hitting the API directly - which is
// exactly why requireRole() exists too.
//
// Deliberately does NOT enforce "does this cookie's role match this path"
// or "redirect away from /login if a session cookie exists" anymore. Both
// of those assumed the shared cookie represents whichever tab is making
// the request - but each tab can now hold its own session in
// sessionStorage (see src/lib/session-fetch.ts), independent of what any
// other tab most recently logged in as. Middleware has no way to read
// another tab's sessionStorage, so it can't know which account THIS
// specific tab actually belongs to - only whether the browser has ever
// logged in at all. The real per-tab check (right role for this path,
// right account for this tab) happens client-side in DashboardLayout,
// which reads this tab's own token.

import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasAnySession = Boolean(req.cookies.get("session_token")?.value);

  const isProtectedPage =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/student");

  // Nobody in this browser has ever logged in (no cookie at all) and
  // they're trying to reach a protected page directly -> bounce to login.
  // A browser that DOES have a cookie is let through even on a brand new
  // tab with no sessionStorage token yet - that tab's own client-side
  // check (DashboardLayout) decides from there, same as any other tab.
  if (isProtectedPage && !hasAnySession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/login"],
};