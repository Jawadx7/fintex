import "server-only";

import {
  Prisma,
  type RiskAssessment,
  type Transaction,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type {
  AlertDetail,
  AlertListItem,
  AlertReviewStatus,
  AlertTier,
  AlertsPage,
} from "./dto";
import {
  clampPage,
  normalizePageSize,
  totalPagesFor,
} from "./pagination";
import {
  rangeToSince,
  summarize,
  type AlertSummary,
  type RangeKey,
  type SummaryEntry,
} from "./summary";

const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;

type TransactionWithAssessment = Prisma.TransactionGetPayload<{
  include: { assessment: true };
}>;
type AssessmentWithTransaction = Prisma.RiskAssessmentGetPayload<{
  include: { transaction: true };
}>;

function toListItemFromTransaction(
  tx: Transaction,
  a: RiskAssessment | null
): AlertListItem {
  return {
    id: a?.id ?? tx.id,
    transactionId: tx.id,
    occurredAt: tx.occurredAt.toISOString(),
    createdAt: tx.createdAt.toISOString(),
    amount: tx.amount.toString(),
    currency: tx.currency,
    type: tx.type,
    senderWallet: tx.senderWallet,
    receiverWallet: tx.receiverWallet,
    senderBalanceBefore: tx.senderBalanceBefore?.toString() ?? null,
    // Null (rendered as "—") when there is no assessment, or when the
    // assessment ran in rules-only mode with no model score.
    riskScore: a?.riskScore ?? null,
    tier: a?.tier ?? "LOW",
    action: a?.action ?? "ALLOW",
    tags: a?.tags ?? [],
    reviewStatus: a?.reviewStatus ?? null,
    reviewedAt: a?.reviewedAt?.toISOString() ?? null,
  };
}

function toListItem(a: AssessmentWithTransaction): AlertListItem {
  return toListItemFromTransaction(a.transaction, a);
}

function relatedIdsFromEvidence(evidence: Prisma.JsonValue | null): string[] {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return [];
  }
  const value = (evidence as Record<string, unknown>).relatedTransactionIds;
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export interface ListAlertsParams {
  tier?: AlertTier;
  tag?: string;
  status?: AlertReviewStatus;
  q?: string;
  range?: RangeKey;
  includeCleared?: boolean;
  page: number;
  pageSize: number;
}

/** Newest-first, page-paginated alert list. Excludes LOW unless asked. */
export async function listAlerts(
  tenantId: string,
  params: ListAlertsParams
): Promise<AlertsPage> {
  const {
    tier,
    tag,
    status,
    q,
    range = "all",
    includeCleared = false,
    page: requestedPage,
    pageSize,
  } = params;

  const size = normalizePageSize(pageSize);

  const transactionWhere: Prisma.TransactionWhereInput = { tenantId };
  const since = rangeToSince(range);
  if (since) transactionWhere.occurredAt = { gte: since };
  if (q) {
    transactionWhere.OR = [
      { senderWallet: { contains: q, mode: "insensitive" } },
      { receiverWallet: { contains: q, mode: "insensitive" } },
      { idempotencyKey: { contains: q, mode: "insensitive" } },
      { id: { contains: q, mode: "insensitive" } },
    ];
  }

  const where: Prisma.RiskAssessmentWhereInput = { tenantId };
  if (tier) {
    where.tier = tier;
  } else if (!includeCleared) {
    where.tier = { in: ["MEDIUM", "HIGH"] };
  }
  if (tag) where.tags = { has: tag };
  if (status) where.reviewStatus = status;
  if (Object.keys(transactionWhere).length > 0) {
    where.transaction = transactionWhere;
  }

  const total = await prisma.riskAssessment.count({ where });
  const totalPages = totalPagesFor(total, size);
  const page = clampPage(requestedPage, totalPages);

  const rows =
    total === 0
      ? []
      : await prisma.riskAssessment.findMany({
          where,
          include: { transaction: true },
          // Stable ordering: newest first, ties broken by id.
          orderBy: [{ transaction: { occurredAt: "desc" } }, { id: "desc" }],
          skip: (page - 1) * size,
          take: size,
        });

  return {
    items: rows.map(toListItem),
    total,
    page,
    pageSize: size,
    totalPages,
  };
}

/** Aggregate totals, per-day series and per-tag counts for a time range. */
export async function getSummary(
  tenantId: string,
  range: RangeKey = "all"
): Promise<AlertSummary> {
  const since = rangeToSince(range);
  const occurredAt = since ? { gte: since } : undefined;

  const [totalTransactions, assessments] = await Promise.all([
    prisma.transaction.count({
      where: { tenantId, ...(occurredAt ? { occurredAt } : {}) },
    }),
    prisma.riskAssessment.findMany({
      where: {
        tenantId,
        ...(occurredAt ? { transaction: { occurredAt } } : {}),
      },
      include: { transaction: { select: { occurredAt: true } } },
    }),
  ]);

  const entries: SummaryEntry[] = assessments.map((a) => ({
    tier: a.tier,
    tags: a.tags,
    reviewStatus: a.reviewStatus,
    occurredAt: a.transaction.occurredAt,
  }));

  return summarize(entries, totalTransactions);
}

/** Full alert detail incl. related transactions and sender history. */
export async function getAlertDetail(
  tenantId: string,
  id: string
): Promise<AlertDetail | null> {
  const assessment = await prisma.riskAssessment.findFirst({
    where: { id, tenantId },
    include: {
      transaction: true,
      reviewedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  if (!assessment) return null;

  const tx = assessment.transaction;
  const relatedIds = relatedIdsFromEvidence(assessment.evidence);

  const [related, history] = await Promise.all([
    relatedIds.length
      ? prisma.transaction.findMany({
          where: { tenantId, id: { in: relatedIds } },
          include: { assessment: true },
        })
      : Promise.resolve<TransactionWithAssessment[]>([]),
    prisma.transaction.findMany({
      where: {
        tenantId,
        senderWallet: tx.senderWallet,
        occurredAt: {
          gte: new Date(tx.occurredAt.getTime() - HISTORY_WINDOW_MS),
          lte: new Date(tx.occurredAt.getTime() + HISTORY_WINDOW_MS),
        },
      },
      include: { assessment: true },
      orderBy: { occurredAt: "asc" },
    }),
  ]);

  const reviewer = assessment.reviewedBy;

  return {
    ...toListItem(assessment),
    reasons: assessment.reasons,
    evidence: assessment.evidence,
    modelVersion: assessment.modelVersion,
    latencyMs: assessment.latencyMs,
    reviewNote: assessment.reviewNote,
    reviewedBy: reviewer
      ? {
          id: reviewer.id,
          name: `${reviewer.firstName} ${reviewer.lastName}`.trim(),
          email: reviewer.email,
        }
      : null,
    relatedTransactions: related.map((tx) =>
      toListItemFromTransaction(tx, tx.assessment)
    ),
    senderHistory: history.map((tx) =>
      toListItemFromTransaction(tx, tx.assessment)
    ),
  };
}

export type ReviewResult =
  | { ok: true; detail: AlertDetail }
  | { ok: false; reason: "not_found" | "no_review" };

/**
 * Record an analyst review. Assessments that never required a review (LOW,
 * reviewStatus null) cannot be moved into a review state.
 */
export async function updateReview(
  tenantId: string,
  id: string,
  update: { status: AlertReviewStatus; note?: string },
  reviewedById: string
): Promise<ReviewResult> {
  const existing = await prisma.riskAssessment.findFirst({
    where: { id, tenantId },
    select: { reviewStatus: true },
  });

  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.reviewStatus === null) return { ok: false, reason: "no_review" };

  await prisma.riskAssessment.update({
    where: { id },
    data: {
      reviewStatus: update.status,
      reviewNote: update.note ?? null,
      reviewedById,
      reviewedAt: new Date(),
    },
  });

  const detail = await getAlertDetail(tenantId, id);
  if (!detail) return { ok: false, reason: "not_found" };
  return { ok: true, detail };
}
