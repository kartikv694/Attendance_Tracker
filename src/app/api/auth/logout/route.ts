// POST /api/auth/logout
// Just clears the session cookie. No request body needed.

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
