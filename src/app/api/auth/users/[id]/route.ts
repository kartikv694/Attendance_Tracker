//  the frontend now passes its own
// user id in the URL instead. Still only lets a user fetch their own
// record: the :id in the URL must match the id inside their session
// token, otherwise this would let any logged-in user look up anyone
// else's account just by guessing/changing the id in the URL.

// GET /api/auth/users/:id
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) return errorResponse("not authenticated", 401);

  if (currentUser.userId !== id) {
    return errorResponse("you can only look up your own account", 403);
  }

  return NextResponse.json(currentUser);
}
