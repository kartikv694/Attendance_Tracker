// Lets the frontend ask "is anyone logged in right now, and who".
// Used on app load to decide which dashboard to render / whether to redirect to login.


// GET /api/auth/me
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api-helpers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return errorResponse("not authenticated", 401);
  return NextResponse.json(user);
}
