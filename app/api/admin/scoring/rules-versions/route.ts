import { NextResponse } from "next/server";
import { z } from "zod";

import { assertAdminTenant } from "@/lib/auth/guards";
import { RulesPackSchema } from "@/lib/engine";
import { createRulesVersion, listRulesVersions } from "@/lib/scoring/management";
import { readJsonBody } from "@/lib/scoring/request";

export const dynamic = "force-dynamic";

/** Rules packs are the largest management uploads. */
const MAX_BODY_BYTES = 100 * 1024;

const CreateSchema = z.object({
  note: z.string().max(500).optional(),
  config: RulesPackSchema,
});

export async function GET() {
  const guard = await assertAdminTenant();
  if (guard instanceof NextResponse) return guard;

  const items = await listRulesVersions(guard.tenantId);
  if (!items) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const guard = await assertAdminTenant();
  if (guard instanceof NextResponse) return guard;

  const read = await readJsonBody(request, MAX_BODY_BYTES);
  if (!read.ok) return read.response;

  const parsed = CreateSchema.safeParse(read.body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid rules pack", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const created = await createRulesVersion(guard.tenantId, parsed.data.config, {
    createdById: guard.userId,
    note: parsed.data.note ?? null,
  });
  if (!created) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json(created, { status: 201 });
}
