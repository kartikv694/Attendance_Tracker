// Step 1 of the forgot-password flow. Takes an email, and if an account
// with that email exists, generates a random 6-digit code, hashes it (same
// reasoning as password hashing - if the DB leaks, the code alone isn't
// enough), stores the hash + a 10-minute expiry on the user, and emails
// the plain code to them.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { errorResponse } from "@/lib/api-helpers";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { sendPasswordResetEmail } from "@/lib/email";

// falls back to 5 minutes if the env var is missing/unparseable, so a
// misconfigured .env degrades gracefully instead of producing NaN and
// silently creating codes that are already "expired" the instant they're made
const CODE_VALID_MINUTES = Number(process.env.CODE_VALID_MINUTES) || 5;

function generateSixDigitCode(): string {
  // crypto.randomInt is uniform (unlike Math.random-based approaches) and
  // always produces a full 6 digits, no leading-zero edge cases to handle
  return(
   crypto.randomInt(1, 10).toString() +
   crypto.randomInt(0, 100_000).toString().padStart(5, "0")
);}

// POST /api/auth/forgot-password
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return errorResponse("no account exists with this email", 404);
  }

  const code = generateSixDigitCode();
  const resetCodeHash = await hashPassword(code); // bcrypt hash, reusing the same helper as login passwords
  const resetCodeExpiresAt = new Date(Date.now() + CODE_VALID_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetCodeHash, resetCodeExpiresAt },
  });

  try {
    await sendPasswordResetEmail(user.email, code);
  } catch (err) {
    console.error("Failed to send password reset email:", err);
    return errorResponse(
      "couldn't send the reset email right now - please try again shortly",
      502
    );
  }

  return NextResponse.json({
    message: "a 6-digit code has been sent to your email",
  });
}
