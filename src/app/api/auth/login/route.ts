// Checks email/password, and if valid, signs a JWT and sets it as an
// httpOnly cookie. This is the only route where a client sends a raw password.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSessionToken, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";
import { errorResponse } from "@/lib/api-helpers";

// Login Api
// POST /api/auth/login
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message, 400);
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

// email exists or the password was wrong, just "credentials are wrong"
  if (!user) {
    return errorResponse("invalid email or password", 401);
  }

//   Password Verify
  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    return errorResponse("invalid email or password", 401);
  }

  const token = await signSessionToken({
    userId: user.id,
    role: user.role,
    email: user.email,
  });

  await setSessionCookie(token);

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
}
