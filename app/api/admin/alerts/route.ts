import { NextResponse } from "next/server";
import { z } from "zod";

import { assertAdmin } from "@/lib/auth/guards";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "@/lib/compliance/pagination";
import { listAlerts } from "@/lib/compliance/queries";
import {
  ReviewStatusSchema,
  RiskTierSchema,
} from "@/lib/compliance/schemas";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  tier: RiskTierSchema.optional(),
  tag: z.string().min(1).optional(),
  status: ReviewStatusSchema.optional(),
  q: z.string().min(1).optional(),
  range: z.enum(["24h", "7d", "all"]).default("all"),
  includeCleared: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .default(DEFAULT_PAGE_SIZE)
    .transform((n) => Math.min(n, MAX_PAGE_SIZE)),
});

export async function GET(request: Request) {
  const result = await assertAdmin();
  if (result instanceof NextResponse) return result;

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

  const page = await listAlerts(parsed.data);
  return NextResponse.json(page);
}
