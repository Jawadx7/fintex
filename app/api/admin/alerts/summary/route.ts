import { NextResponse } from "next/server";
import { z } from "zod";

import { assertAdminTenant } from "@/lib/auth/guards";
import { getSummary } from "@/lib/compliance/queries";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  range: z.enum(["24h", "7d", "all"]).default("all"),
});

export async function GET(request: Request) {
  const guard = await assertAdminTenant();
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = new URL(request.url);
  const raw: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (value !== "") raw[key] = value;
  });

  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const summary = await getSummary(guard.tenantId, parsed.data.range);
  return NextResponse.json(summary);
}
