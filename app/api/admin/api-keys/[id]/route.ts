import { NextResponse } from "next/server";

import { assertAdminTenant } from "@/lib/auth/guards";
import { revokeApiKey } from "@/lib/scoring/management";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** Revoke (soft-delete) an API key. */
export async function DELETE(_request: Request, context: RouteContext) {
  const guard = await assertAdminTenant();
  if (guard instanceof NextResponse) return guard;

  const { id } = await context.params;
  const revoked = await revokeApiKey(guard.tenantId, id);
  if (!revoked) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(revoked);
}
