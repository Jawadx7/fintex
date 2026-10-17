import { NextResponse } from "next/server";
import { z } from "zod";

import { assertAdminTenant } from "@/lib/auth/guards";
import { createApiKey, listApiKeys } from "@/lib/scoring/management";
import { readJsonBody } from "@/lib/scoring/request";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;

const CreateSchema = z.object({ name: z.string().min(1).max(80) });

export async function GET() {
  const guard = await assertAdminTenant();
  if (guard instanceof NextResponse) return guard;

  const items = await listApiKeys(guard.tenantId);
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
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const created = await createApiKey(guard.tenantId, parsed.data.name);
  if (!created) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json(created, { status: 201 });
}
