// Middle step of the forgot-password flow. Checks that the 6-digit code
// is correct and not expired - WITHOUT touching the password and
// WITHOUT clearing the code, since the actual reset-password call still
// needs to re-verify it. This just lets the frontend show "verification
// successful" and reveal the new-password fields before asking for a
// new password at all.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { errorResponse } from "@/lib/api-helpers";
import { verifyResetCodeSchema } from "@/lib/validations/auth";

// POST /api/auth/verify-reset-code
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = verifyResetCodeSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
  const { email, code } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // same generic message whether the email is wrong or the code is wrong -
  // this endpoint never confirms which emails exist
  if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt) {
    return errorResponse("invalid or expired code", 400);
  }

  if (user.resetCodeExpiresAt < new Date()) {
    return errorResponse("this code has expired - request a new one", 400);
  }

  const codeMatches = await verifyPassword(code, user.resetCodeHash);
  if (!codeMatches) {
    return errorResponse("invalid or expired code", 400);
  }

  return NextResponse.json({ message: "code verified" });
}
