import { NextResponse } from "next/server";
import { z } from "zod";

import { CanonicalTransactionInputSchema } from "@/lib/engine";
import { authenticateApiKey } from "@/lib/scoring/api-keys";
import {
  ScoringConfigError,
  scoringConfigFromTenant,
} from "@/lib/scoring/config";
import { apiError, readJsonBody } from "@/lib/scoring/request";
import {
  IdempotencyKeyReuseError,
  scoreTransaction,
} from "@/lib/scoring/service";

export const dynamic = "force-dynamic";

/** Hard cap on request bodies; score payloads are tiny. */
const MAX_BODY_BYTES = 16 * 1024;
const MAX_IDEMPOTENCY_KEY = 200;

const ScoreBodySchema = z
  .object({ transaction: CanonicalTransactionInputSchema })
  .strict();

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request.headers.get("authorization"));
  if (!auth) {
    return apiError(401, "invalid_api_key", "Invalid or missing API key");
  }

  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey || idempotencyKey.length > MAX_IDEMPOTENCY_KEY) {
    return apiError(
      400,
      "missing_idempotency_key",
      "Idempotency-Key header is required (1-200 chars)"
    );
  }

  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;

  const parsed = ScoreBodySchema.safeParse(body.body);
  if (!parsed.success) {
    return apiError(
      400,
      "validation_error",
      "Invalid request body",
      parsed.error.issues
    );
  }

  try {
    // The active rules + model arrived with the API key, so no second lookup.
    const config = scoringConfigFromTenant(auth.tenant);
    const { response, replayed } = await scoreTransaction({
      config,
      idempotencyKey,
      input: parsed.data.transaction,
    });
    const headers = replayed
      ? { "Idempotent-Replayed": "true" }
      : undefined;
    return NextResponse.json(response, { status: 200, headers });
  } catch (error) {
    if (error instanceof IdempotencyKeyReuseError) {
      return apiError(409, "idempotency_key_reuse", error.message);
    }
    if (error instanceof ScoringConfigError) {
      return apiError(503, "rules_not_configured", error.message);
    }
    console.error("Scoring failed:", error);
    return apiError(500, "internal_error", "Failed to score transaction");
  }
}
