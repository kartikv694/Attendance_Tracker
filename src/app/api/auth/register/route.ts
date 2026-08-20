//

// This is the admin register api whch is used for the registration of the admin 
// as the admin is needed for the opeartions. So is the admin account is already present 
// it will show that admin account is already present and it will be freezed so any 
// other user cannot register any account only admin can do after it is logged in. 

// Register Api
// POST /api/auth/register
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { errorResponse } from "@/lib/api-helpers";
import { registerAdminSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerAdminSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

  const { name, email, password } = parsed.data;

  const adminAlreadyExists = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (adminAlreadyExists) {
    return errorResponse(
      "an admin account already exists - ask an existing admin to create your account",
      403
    );
  }

  const emailTaken = await prisma.user.findUnique({ where: { email } });
  if (emailTaken) return errorResponse("a user with this email already exists", 409);

  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.create({
    data: { name, email, passwordHash, role: "ADMIN" },
  });

  return NextResponse.json(
    { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    { status: 201 }
  );
}
