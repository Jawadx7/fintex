import { z } from "zod";

import {
  ReviewStatus,
  RiskAction,
  RiskTier,
  TransactionType,
} from "@/generated/prisma/client";

// Money is always a string on the wire and a Decimal in the database. Never a
// JS number, so we never lose cents to floating point.
export const MoneyStringSchema = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, "amount must have at most 2 decimal places");

export const RiskTierSchema = z.enum(RiskTier);
export const RiskActionSchema = z.enum(RiskAction);
export const TransactionTypeSchema = z.enum(TransactionType);
export const ReviewStatusSchema = z.enum(ReviewStatus);

// Kept in sync with TypologyTag in ./typologies. Declared as literals (rather
// than derived from TYPOLOGY_TAGS) so Zod infers the exact union.
export const TypologyTagSchema = z.enum([
  "FULL_BALANCE_DRAIN",
  "THRESHOLD_SKIRTING",
  "RAPID_SEQUENCE",
  "PASS_THROUGH",
]);

/** Structured, machine-checkable backing for a typology tag. */
export const EvidenceSchema = z
  .object({
    relatedTransactionIds: z.array(z.string().min(1)),
    windowMinutes: z.number().int().positive().optional(),
    thresholdGhs: z.number().positive().optional(),
    drainRatio: z.number().min(0).max(1).optional(),
  })
  .strict();

/**
 * Output contract of the (future) scoring engine. The seed writes rows that
 * satisfy this, and the dashboard reads rows that satisfy this, so both sides
 * agree on shape before the engine exists.
 */
export const RiskAssessmentOutputSchema = z.object({
  riskScore: z.number().min(0).max(1),
  tier: RiskTierSchema,
  action: RiskActionSchema,
  tags: z.array(TypologyTagSchema),
  reasons: z.array(z.string().min(1)).min(1),
  evidence: EvidenceSchema.nullable(),
  modelVersion: z.string().min(1),
  latencyMs: z.number().int().nonnegative().optional(),
});

export type RiskAssessmentOutput = z.infer<typeof RiskAssessmentOutputSchema>;

/**
 * Input contract for the (future) ingestion endpoint. Defined now so the
 * engine and the demo data can't drift; no endpoint is built in this brief.
 */
export const TransactionIngestInputSchema = z.object({
  idempotencyKey: z.string().min(1),
  type: TransactionTypeSchema,
  amount: MoneyStringSchema,
  currency: z.string().length(3).default("GHS"),
  senderWallet: z.string().min(1),
  receiverWallet: z.string().min(1),
  senderBalanceBefore: MoneyStringSchema.nullable().optional(),
  occurredAt: z.coerce.date(),
});

export type TransactionIngestInput = z.infer<
  typeof TransactionIngestInputSchema
>;

/** Body for PATCH /api/admin/alerts/[id]. */
export const ReviewUpdateSchema = z.object({
  status: ReviewStatusSchema,
  note: z.string().max(2000).optional(),
});

export type ReviewUpdate = z.infer<typeof ReviewUpdateSchema>;

/** A MEDIUM/HIGH assessment requires analyst review; LOW does not. */
export function requiresReview(tier: z.infer<typeof RiskTierSchema>): boolean {
  return tier === "MEDIUM" || tier === "HIGH";
}
