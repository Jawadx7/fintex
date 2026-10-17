import "server-only";

import { randomUUID } from "node:crypto";

import {
  Prisma,
  type RiskAssessment,
  type Transaction,
} from "@/generated/prisma/client";
import {
  assess,
  collectHistoryWindows,
  toCanonicalTransaction,
  type CanonicalTransaction,
  type CanonicalTransactionInput,
  type FeatureContribution,
} from "@/lib/engine";
import { prisma } from "@/lib/prisma";

import type { ScoringConfig } from "./config";
import { loadHistory } from "./history";
import type { ScoreResponse } from "./dto";

export interface ScoreTransactionRequest {
  /** Active config for the tenant, loaded alongside the API key (one query). */
  config: ScoringConfig;
  idempotencyKey: string;
  input: CanonicalTransactionInput;
  /** When false, nothing is persisted (Brief 4.2 playground). Default true. */
  persist?: boolean;
}

export interface ScoreTransactionOutcome {
  response: ScoreResponse;
  /** True when the stored result for this idempotency key was replayed. */
  replayed: boolean;
}

/** Same idempotency key was reused with a different payload. */
export class IdempotencyKeyReuseError extends Error {
  constructor() {
    super("Idempotency-Key was reused with a different payload");
    this.name = "IdempotencyKeyReuseError";
  }
}

type AssessmentWithRules = RiskAssessment & {
  rulesVersion: { versionNumber: number };
};

function stableAttributes(
  attrs: Record<string, string | number | boolean>
): string {
  const sorted = Object.keys(attrs)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = attrs[key];
      return acc;
    }, {});
  return JSON.stringify(sorted);
}

function money(value: number | null): string | null {
  return value === null ? null : value.toFixed(2);
}

/** Stable fingerprint of a canonical transaction, for replay comparison. */
function canonicalFingerprint(tx: CanonicalTransaction): string {
  return JSON.stringify({
    externalId: tx.externalId ?? null,
    type: tx.type,
    amount: tx.amount.toFixed(2),
    currency: tx.currency,
    senderWalletId: tx.senderWalletId,
    receiverWalletId: tx.receiverWalletId,
    senderBalanceBefore: money(tx.senderBalanceBefore),
    receiverBalanceBefore: money(tx.receiverBalanceBefore),
    occurredAt: tx.occurredAt.toISOString(),
    attributes: stableAttributes(tx.attributes),
  });
}

type StoredTransaction = Pick<
  Transaction,
  | "externalId"
  | "type"
  | "amount"
  | "currency"
  | "senderWallet"
  | "receiverWallet"
  | "senderBalanceBefore"
  | "receiverBalanceBefore"
  | "occurredAt"
  | "attributes"
>;

function rowFingerprint(row: StoredTransaction): string {
  const attributes =
    row.attributes && typeof row.attributes === "object"
      ? (row.attributes as Record<string, string | number | boolean>)
      : {};
  return JSON.stringify({
    externalId: row.externalId ?? null,
    type: row.type,
    amount: row.amount.toFixed(2),
    currency: row.currency,
    senderWalletId: row.senderWallet,
    receiverWalletId: row.receiverWallet,
    senderBalanceBefore: row.senderBalanceBefore?.toFixed(2) ?? null,
    receiverBalanceBefore: row.receiverBalanceBefore?.toFixed(2) ?? null,
    occurredAt: row.occurredAt.toISOString(),
    attributes: stableAttributes(attributes),
  });
}

function replayResponse(
  requestId: string,
  tx: Transaction,
  a: AssessmentWithRules
): ScoreResponse {
  return {
    requestId,
    transactionId: tx.id,
    mode: a.mode,
    riskScore: a.riskScore,
    tier: a.tier,
    action: a.action,
    tags: a.tags,
    reasons: (a.reasonsDetail as ScoreResponse["reasons"] | null) ?? [],
    contributions:
      (a.contributions as ScoreResponse["contributions"] | null) ?? [],
    imputedFeatures: (a.imputedFeatures as string[] | null) ?? [],
    skippedRules:
      (a.skippedRules as ScoreResponse["skippedRules"] | null) ?? [],
    modelVersion: a.mode === "RULES_ONLY" ? null : a.modelVersion,
    rulesVersion: a.rulesVersion.versionNumber,
    historyAvailable: a.historyAvailable,
    historyTruncated: a.historyTruncated,
    latencyMs: a.latencyMs ?? 0,
  };
}

function topContributions(
  contributions: FeatureContribution[]
): ScoreResponse["contributions"] {
  return [...contributions]
    .sort((x, y) => Math.abs(y.contribution) - Math.abs(x.contribution))
    .slice(0, 5)
    .map((c) => ({
      feature: c.feature,
      value: c.x,
      z: c.z,
      contribution: c.contribution,
    }));
}

/**
 * Score a transaction for a tenant (section 8).
 *
 * Idempotency is keyed on (tenantId, idempotencyKey): a replay with the same
 * payload returns the stored result without re-scoring; a different payload
 * throws IdempotencyKeyReuseError. Concurrent requests are serialised by the DB
 * unique constraint — the loser re-reads and replays.
 */
export async function scoreTransaction(
  request: ScoreTransactionRequest
): Promise<ScoreTransactionOutcome> {
  const { config, idempotencyKey, input } = request;
  const tenantId = config.tenantId;
  const persist = request.persist !== false;
  const canonical = toCanonicalTransaction(input);
  const requestId = `req_${randomUUID()}`;

  const windows = collectHistoryWindows(config.rulesPack);

  const startedAt = Date.now();

  // The idempotency pre-check and the history load are independent, so run them
  // together (one round-trip wave). A replay wastes the history query, which is
  // rare and cheap relative to the saved write.
  const [existing, history] = await Promise.all([
    persist
      ? prisma.transaction.findUnique({
          where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
          include: { assessment: { include: { rulesVersion: true } } },
        })
      : Promise.resolve(null),
    loadHistory({ tenantId, transaction: canonical, scopes: windows }),
  ]);

  if (existing?.assessment) {
    if (rowFingerprint(existing) !== canonicalFingerprint(canonical)) {
      throw new IdempotencyKeyReuseError();
    }
    return {
      response: replayResponse(requestId, existing, existing.assessment),
      replayed: true,
    };
  }

  const result = assess({
    transaction: canonical,
    history,
    pack: config.rulesPack,
    model: config.model,
  });
  const latencyMs = Date.now() - startedAt;
  const response: ScoreResponse = {
    requestId,
    transactionId: null,
    mode: result.mode,
    riskScore: result.riskScore,
    tier: result.tier,
    action: result.action,
    tags: result.tags,
    reasons: result.reasons.map((hit) => ({
      ruleId: hit.id,
      tag: hit.tag,
      severity: hit.severity,
      message: hit.reason,
      evidence: hit.evidence,
    })),
    contributions: topContributions(result.contributions),
    imputedFeatures: result.imputedFeatures,
    skippedRules: result.skippedRules,
    modelVersion: result.modelVersion,
    rulesVersion: config.rulesVersionNumber,
    historyAvailable: result.historyAvailable,
    historyTruncated: result.historyTruncated,
    latencyMs,
  };

  if (!persist) {
    return { response, replayed: false };
  }

  const transactionData = {
    tenantId,
    idempotencyKey,
    externalId: input.externalId ?? null,
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    senderWallet: input.sender.walletId,
    receiverWallet: input.receiver.walletId,
    senderBalanceBefore: input.sender.balanceBefore ?? null,
    receiverBalanceBefore: input.receiver.balanceBefore ?? null,
    attributes: input.attributes as Prisma.InputJsonValue,
    occurredAt: input.occurredAt,
  };

  const assessmentData = {
    tenantId,
    riskScore: result.riskScore,
    tier: result.tier,
    action: result.action,
    tags: result.tags,
    reasons: response.reasons.map((r) => r.message),
    reasonsDetail: response.reasons as unknown as Prisma.InputJsonValue,
    evidence: Prisma.DbNull,
    contributions: response.contributions as unknown as Prisma.InputJsonValue,
    mode: result.mode,
    historyAvailable: result.historyAvailable,
    historyTruncated: result.historyTruncated,
    skippedRules: result.skippedRules as unknown as Prisma.InputJsonValue,
    imputedFeatures: result.imputedFeatures as unknown as Prisma.InputJsonValue,
    modelVersion: result.modelVersion ?? "rules-only",
    modelVersionId: config.modelVersionId,
    rulesVersionId: config.rulesVersionId,
    latencyMs,
    reviewStatus: result.tier === "LOW" ? null : ("OPEN" as const),
  };

  try {
    // One write: the transaction and its assessment are created in a single
    // nested write (Prisma wraps them in one transaction).
    const created = await prisma.transaction.create({
      data: {
        ...transactionData,
        assessment: { create: assessmentData },
      },
      select: { id: true },
    });
    return { response: { ...response, transactionId: created.id }, replayed: false };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // A concurrent request won the race: re-read and replay.
      const winner = await prisma.transaction.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
        include: { assessment: { include: { rulesVersion: true } } },
      });
      if (winner?.assessment) {
        if (rowFingerprint(winner) !== canonicalFingerprint(canonical)) {
          throw new IdempotencyKeyReuseError();
        }
        return {
          response: replayResponse(requestId, winner, winner.assessment),
          replayed: true,
        };
      }
    }
    throw error;
  }
}
