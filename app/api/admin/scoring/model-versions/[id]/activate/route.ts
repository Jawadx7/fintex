import { NextResponse } from "next/server";

import { assertAdminTenant } from "@/lib/auth/guards";
import { activateModelVersion } from "@/lib/scoring/management";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** Make an existing model version the tenant's active model. */
export async function POST(_request: Request, context: RouteContext) {
  const guard = await assertAdminTenant();
  if (guard instanceof NextResponse) return guard;

  const { id } = await context.params;
  const activated = await activateModelVersion(guard.tenantId, id);
  if (!activated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(activated);
}
