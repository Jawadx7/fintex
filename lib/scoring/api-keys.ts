import "server-only";

import { timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/prisma";

import type { TenantScoringSource } from "./config";
import {
  extractKeyPrefix,
  hashApiKey,
  parseBearerToken,
} from "./api-key-format";

export interface ApiKeyAuth {
  tenantId: string;
  apiKeyId: string;
  /**
   * The owning tenant with its active rules + model, loaded in the same query
   * as the key so scoring needs no second config lookup.
   */
  tenant: TenantScoringSource;
}

/**
 * Verify a bearer key against the ApiKey table and, in the same round trip,
 * load the owning tenant's active rules and model (Task D perf: one query for
 * key + tenant + active model + active rules). Returns null for a
 * missing/malformed/unknown/revoked key. The stored hash is compared in
 * constant time. A successful verify refreshes `lastUsedAt` at most once a
 * minute (a separate, throttled write).
 */
export async function authenticateApiKey(
  authorizationHeader: string | null
): Promise<ApiKeyAuth | null> {
  const key = parseBearerToken(authorizationHeader);
  if (!key) return null;

  const prefix = extractKeyPrefix(key);
  if (!prefix) return null;

  const record = await prisma.apiKey.findUnique({
    where: { prefix },
    select: {
      id: true,
      tenantId: true,
      hash: true,
      revokedAt: true,
      lastUsedAt: true,
      tenant: {
        select: {
          id: true,
          slug: true,
          activeRulesVersion: {
            select: { id: true, versionNumber: true, config: true },
          },
          activeModelVersion: { select: { id: true, weights: true } },
        },
      },
    },
  });
  if (!record || record.revokedAt) return null;

  const provided = new Uint8Array(Buffer.from(hashApiKey(key), "hex"));
  const stored = new Uint8Array(Buffer.from(record.hash, "hex"));
  if (provided.length !== stored.length || !timingSafeEqual(provided, stored)) {
    return null;
  }

  // Refresh lastUsedAt at most once per minute to avoid a write on every call.
  const now = Date.now();
  const last = record.lastUsedAt?.getTime() ?? 0;
  if (now - last >= 60_000) {
    await prisma.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date(now) },
    });
  }

  return { tenantId: record.tenantId, apiKeyId: record.id, tenant: record.tenant };
}
