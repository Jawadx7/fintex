import { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { assertAdmin } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await assertAdmin();

  // assertAdmin returns a ready-to-send 401/403 response when the caller is not
  // an authenticated admin.
  if (result instanceof NextResponse) {
    return result;
  }

  const session = result as Session;

  return NextResponse.json({
    id: session.user.id,
    role: session.user.role,
  });
}
