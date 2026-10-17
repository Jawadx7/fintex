import { NextResponse } from "next/server";

import { assertAdminTenant } from "@/lib/auth/guards";
import { getActiveConfig } from "@/lib/scoring/management";

export const dynamic = "force-dynamic";

/** The tenant's active rules + model versions. */
export async function GET() {
  const guard = await assertAdminTenant();
  if (guard instanceof NextResponse) return guard;

  const config = await getActiveConfig(guard.tenantId);
  if (!config) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json(config);
}
