import { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { assertAdmin } from "@/lib/auth/guards";
import { getAlertDetail, updateReview } from "@/lib/compliance/queries";
import { ReviewUpdateSchema } from "@/lib/compliance/schemas";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const result = await assertAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = await context.params;
  const detail = await getAlertDetail(id);

  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function PATCH(request: Request, context: RouteContext) {
  const result = await assertAdmin();
  if (result instanceof NextResponse) return result;
  const session = result as Session;

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

  const outcome = await updateReview(id, parsed.data, session.user.id);

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
