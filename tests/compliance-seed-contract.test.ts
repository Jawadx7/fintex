import { describe, expect, it, vi } from "vitest";

// The schemas import the generated enum objects. Stub them so this unit test
// doesn't pull the Prisma runtime (same pattern as register-user.test.ts).
vi.mock("@/generated/prisma/client", () => ({
  RiskTier: { LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH" },
  RiskAction: {
    ALLOW: "ALLOW",
    ALLOW_AND_REVIEW: "ALLOW_AND_REVIEW",
    HOLD_AND_ALERT: "HOLD_AND_ALERT",
  },
  ReviewStatus: {
    OPEN: "OPEN",
    ESCALATED: "ESCALATED",
    DISMISSED: "DISMISSED",
    CONFIRMED: "CONFIRMED",
  },
  TransactionType: { TRANSFER: "TRANSFER", CASH_OUT: "CASH_OUT" },
}));

import { buildSeedRows } from "@/lib/compliance/seed-data";
import {
  RiskAssessmentOutputSchema,
  TransactionIngestInputSchema,
  requiresReview,
} from "@/lib/compliance/schemas";

const NOW = new Date(2026, 9, 15, 12, 0, 0);
const rows = buildSeedRows(NOW);

describe("compliance seed dataset", () => {
  it("has the planned composition (52 rows)", () => {
    expect(rows).toHaveLength(52);

    const tiers = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.assessment.tier] = (acc[row.assessment.tier] ?? 0) + 1;
      return acc;
    }, {});

    expect(tiers).toEqual({ LOW: 24, MEDIUM: 2, HIGH: 26 });
  });

  it("uses unique seed_ ids and idempotency keys", () => {
    const keys = rows.map((row) => row.tx.idempotencyKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((key) => key.startsWith("seed_"))).toBe(true);

    const ids = rows.map((row) => row.tx.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every row against the ingest and assessment contracts", () => {
    for (const row of rows) {
      expect(() =>
        TransactionIngestInputSchema.parse({
          idempotencyKey: row.tx.idempotencyKey,
          type: row.tx.type,
          amount: row.tx.amount,
          currency: row.tx.currency,
          senderWallet: row.tx.senderWallet,
          receiverWallet: row.tx.receiverWallet,
          senderBalanceBefore: row.tx.senderBalanceBefore,
          occurredAt: row.tx.occurredAt,
        })
      ).not.toThrow();

      expect(() =>
        RiskAssessmentOutputSchema.parse({
          riskScore: row.assessment.riskScore,
          tier: row.assessment.tier,
          action: row.assessment.action,
          tags: row.assessment.tags,
          reasons: row.assessment.reasons,
          evidence: row.assessment.evidence,
          modelVersion: row.assessment.modelVersion,
          latencyMs: row.assessment.latencyMs,
        })
      ).not.toThrow();
    }
  });

  it("marks LOW as unreviewed and MEDIUM/HIGH as reviewable", () => {
    for (const row of rows) {
      if (row.assessment.tier === "LOW") {
        expect(requiresReview(row.assessment.tier)).toBe(false);
      } else {
        expect(requiresReview(row.assessment.tier)).toBe(true);
      }
      // Only HIGH rows are tagged with a named typology; MEDIUM rows are
      // score-only by design.
      if (row.assessment.tier === "HIGH") {
        expect(row.assessment.tags.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps money as 2dp strings", () => {
    for (const row of rows) {
      expect(row.tx.amount).toMatch(/^\d+\.\d{2}$/);
      if (row.tx.senderBalanceBefore) {
        expect(row.tx.senderBalanceBefore).toMatch(/^\d+\.\d{2}$/);
      }
    }
  });

  it("references only existing transactions in evidence", () => {
    const keys = new Set(rows.map((row) => row.tx.idempotencyKey));
    for (const row of rows) {
      const evidence = row.assessment.evidence;
      if (
        evidence &&
        typeof evidence === "object" &&
        "relatedTransactionIds" in evidence
      ) {
        const related = (evidence as { relatedTransactionIds: string[] })
          .relatedTransactionIds;
        for (const id of related) {
          expect(keys.has(id)).toBe(true);
        }
      }
    }
  });
});
