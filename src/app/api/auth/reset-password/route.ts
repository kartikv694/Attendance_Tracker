// Step 2 of the forgot-password flow. Takes the email, the 6-digit code
// that was emailed in step 1, and a new password. If the code matches and
// hasn't expired, the password is updated and the code is cleared so it
// can't be reused.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { errorResponse } from "@/lib/api-helpers";
import { resetPasswordSchema } from "@/lib/validations/auth";

// POST /api/auth/reset-password
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
  const { email, code, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // same generic message whether the email doesn't exist or the code is
  // wrong - no reason to let this endpoint confirm which emails exist
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

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetCodeHash: null, resetCodeExpiresAt: null },
  });

  return NextResponse.json({ message: "password updated - you can now log in" });
}
