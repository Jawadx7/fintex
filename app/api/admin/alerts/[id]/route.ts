import { NextResponse } from "next/server";

import { assertAdminTenant } from "@/lib/auth/guards";
import { getAlertDetail, updateReview } from "@/lib/compliance/queries";
import { ReviewUpdateSchema } from "@/lib/compliance/schemas";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const guard = await assertAdminTenant();
  if (guard instanceof NextResponse) return guard;

  const { id } = await context.params;
  const detail = await getAlertDetail(guard.tenantId, id);

  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function PATCH(request: Request, context: RouteContext) {
  const guard = await assertAdminTenant();
  if (guard instanceof NextResponse) return guard;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ReviewUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const outcome = await updateReview(
    guard.tenantId,
    id,
    parsed.data,
    guard.userId
  );

  if (!outcome.ok) {
    if (outcome.reason === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "This alert does not require review" },
      { status: 409 }
    );
  }

  return NextResponse.json(outcome.detail);
}
