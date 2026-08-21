//
// Full detail view for the "Profile" sidebar item - unlike /me (which only
// reads the cookie), this one actually queries the DB and returns
// everything relevant to that user, including their role-specific profile:
// - TEACHER: employee code + the subject/sections they've been assigned to teach
// - STUDENT: roll number, section, and the subjects they're enrolled in
// - ADMIN: just the base account fields, there's nothing else to show

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api-helpers";

// GET /api/auth/profile
export async function GET() {
  const session = await getCurrentUser();
  if (!session) return errorResponse("not authenticated", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      teacher: {
        select: {
          employeeCode: true,
          subjectSections: {
            select: {
              subject: { select: { name: true, code: true } },
              section: { select: { name: true, year: true } },
            },
          },
        },
      },
      student: {
        select: {
          rollNumber: true,
          section: { select: { name: true, year: true } },
          enrollments: {
            select: {
              subjectSection: {
                select: {
                  subject: { select: { name: true, code: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  // shouldn't normally happen (session existed but user was deleted since) -
  // still worth handling cleanly instead of returning null fields
  if (!user) return errorResponse("user not found", 404);

  return NextResponse.json(user);
}
