// Deterministic synthetic compliance dataset.
//
// Pure and dependency-free (type-only imports) so both the seed script and the
// Vitest suite can build the exact same rows. Money is always a string; risk
// scores are the only floats, and they are not money.

import type { TypologyTag } from "./typologies";

export type SeedTransactionType = "TRANSFER" | "CASH_OUT";
export type SeedRiskTier = "LOW" | "MEDIUM" | "HIGH";
export type SeedRiskAction = "ALLOW" | "ALLOW_AND_REVIEW" | "HOLD_AND_ALERT";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface SeedTransaction {
  id: string;
  idempotencyKey: string;
  type: SeedTransactionType;
  amount: string;
  currency: string;
  senderWallet: string;
  receiverWallet: string;
  senderBalanceBefore: string | null;
  occurredAt: Date;
}

export interface SeedAssessment {
  riskScore: number;
  tier: SeedRiskTier;
  action: SeedRiskAction;
  tags: TypologyTag[];
  reasons: string[];
  evidence: JsonValue | null;
  modelVersion: string;
  latencyMs: number;
}

export interface SeedRow {
  tx: SeedTransaction;
  assessment: SeedAssessment;
}

export const MODEL_VERSION = "compliance-heuristic-v0";
export const SEED_PREFIX = "seed_";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Stable, realistic-looking wallet id derived from a logical entity name. */
export function wallet(entity: string): string {
  let h = 2166136261;
  for (const ch of entity) {
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  }
  const id = h.toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
  return `wlt_${id}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

/** A fixed wall-clock time `days` ago at `hour:minute`. */
function at(now: Date, days: number, hour: number, minute: number): Date {
  const d = new Date(now.getTime() - days * DAY_MS);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function minutesAgo(now: Date, minutes: number): Date {
  return new Date(now.getTime() - minutes * MIN_MS);
}

function lowNormal(now: Date, index: number, key: string): SeedRow {
  const isCashOut = index % 4 === 0;
  const amount = (25 + ((index * 53) % 780) + 0.5).toFixed(2);
  return {
    tx: {
      id: key,
      idempotencyKey: key,
      type: isCashOut ? "CASH_OUT" : "TRANSFER",
      amount,
      currency: "GHS",
      senderWallet: wallet(`normal-sender-${index}`),
      receiverWallet: wallet(
        isCashOut ? `agent-${index % 3}` : `normal-receiver-${index}`
      ),
      senderBalanceBefore: (Number(amount) + 400 + (index % 5) * 120).toFixed(2),
      occurredAt: at(now, index % 7, 8 + (index % 12), (index * 7) % 60),
    },
    assessment: {
      riskScore: Number((0.03 + (index % 7) * 0.03).toFixed(2)),
      tier: "LOW",
      action: "ALLOW",
      tags: [],
      reasons: ["No rule triggered"],
      evidence: null,
      modelVersion: MODEL_VERSION,
      latencyMs: 22 + (index % 9),
    },
  };
}

/** 4 normal-looking inbound legs that the pass-through cash-outs reference. */
function inboundLeg(
  now: Date,
  index: number,
  amount: string,
  days: number,
  hour: number
): SeedRow {
  const key = `${SEED_PREFIX}in_${pad(index)}`;
  return {
    tx: {
      id: key,
      idempotencyKey: key,
      type: "TRANSFER",
      amount,
      currency: "GHS",
      senderWallet: wallet(`inbound-src-${index}`),
      receiverWallet: wallet(`passthrough-${index}`),
      senderBalanceBefore: (Number(amount) + 1500).toFixed(2),
      occurredAt: at(now, days, hour, 5 * index),
    },
    assessment: {
      riskScore: 0.08,
      tier: "LOW",
      action: "ALLOW",
      tags: [],
      reasons: ["No rule triggered"],
      evidence: null,
      modelVersion: MODEL_VERSION,
      latencyMs: 26,
    },
  };
}

function passThrough(
  index: number,
  amount: string,
  inboundKey: string,
  inboundAt: Date
): SeedRow {
  const key = `${SEED_PREFIX}pass_${pad(index)}`;
  const cashedOut = (Number(amount) - 5).toFixed(2);
  return {
    tx: {
      id: key,
      idempotencyKey: key,
      type: "CASH_OUT",
      amount: cashedOut,
      currency: "GHS",
      senderWallet: wallet(`passthrough-${index}`),
      receiverWallet: wallet(`cash-agent-${index}`),
      senderBalanceBefore: amount,
      occurredAt: new Date(inboundAt.getTime() + (6 + index) * MIN_MS),
    },
    assessment: {
      riskScore: Number((0.82 + index * 0.02).toFixed(2)),
      tier: "HIGH",
      action: "HOLD_AND_ALERT",
      tags: ["PASS_THROUGH", "FULL_BALANCE_DRAIN"],
      reasons: [
        "Inbound transfer cashed out within minutes",
        "Destination balance only covers the matching incoming amount",
      ],
      evidence: {
        relatedTransactionIds: [inboundKey],
        windowMinutes: 30,
        drainRatio: 0.99,
      },
      modelVersion: MODEL_VERSION,
      latencyMs: 54 + index,
    },
  };
}

function takeoverDrain(now: Date, index: number, balance: string): SeedRow {
  const key = `${SEED_PREFIX}drain_${pad(index)}`;
  return {
    tx: {
      id: key,
      idempotencyKey: key,
      type: "TRANSFER",
      amount: balance,
      currency: "GHS",
      senderWallet: wallet(`victim-${index}`),
      receiverWallet: wallet(`mule-new-${index}`),
      senderBalanceBefore: balance,
      occurredAt: at(now, index, (index * 3) % 5, 12 + index),
    },
    assessment: {
      riskScore: Number((0.88 + index * 0.01).toFixed(2)),
      tier: "HIGH",
      action: "HOLD_AND_ALERT",
      tags: ["FULL_BALANCE_DRAIN"],
      reasons: [
        "Sender emptied their entire balance in one transfer",
        "Recipient wallet has no prior history with the sender",
        "Transaction occurred outside the sender's normal hours",
      ],
      evidence: {
        relatedTransactionIds: [],
        drainRatio: 1,
      },
      modelVersion: MODEL_VERSION,
      latencyMs: 61 + index,
    },
  };
}

const CHAIN_SIZES = [3, 3, 3, 4, 4] as const;

function splitChains(now: Date): SeedRow[] {
  const rows: SeedRow[] = [];
  CHAIN_SIZES.forEach((size, c) => {
    const chainIndex = c + 1;
    const base = minutesAgo(now, 180 + chainIndex * 95);
    const keys = Array.from(
      { length: size },
      (_, j) => `${SEED_PREFIX}chain_${pad(chainIndex)}_${pad(j + 1)}`
    );
    for (let j = 0; j < size; j += 1) {
      const key = keys[j]!;
      const amount = (1800 + ((chainIndex * 17 + j * 29) % 190)).toFixed(2);
      rows.push({
        tx: {
          id: key,
          idempotencyKey: key,
          type: "TRANSFER",
          amount,
          currency: "GHS",
          senderWallet: wallet(`chain-sender-${chainIndex}`),
          receiverWallet: wallet(`chain-receiver-${chainIndex}-${j + 1}`),
          senderBalanceBefore: (Number(amount) + 600).toFixed(2),
          occurredAt: new Date(base.getTime() + j * 4 * MIN_MS),
        },
        assessment: {
          riskScore: Number((0.7 + chainIndex * 0.03).toFixed(2)),
          tier: "HIGH",
          action: "HOLD_AND_ALERT",
          tags: ["THRESHOLD_SKIRTING", "RAPID_SEQUENCE"],
          reasons: [
            "Multiple transfers sized just below the GHS 2,000 threshold",
            "Burst of transfers from one wallet within 15 minutes",
          ],
          evidence: {
            relatedTransactionIds: keys.filter((k) => k !== key),
            windowMinutes: 15,
            thresholdGhs: 2000,
          },
          modelVersion: MODEL_VERSION,
          latencyMs: 48 + chainIndex,
        },
      });
    }
  });
  return rows;
}

function mediumScoreOnly(now: Date, index: number): SeedRow {
  const key = `${SEED_PREFIX}med_${pad(index)}`;
  const amount = (900 + index * 350).toFixed(2);
  return {
    tx: {
      id: key,
      idempotencyKey: key,
      type: "TRANSFER",
      amount,
      currency: "GHS",
      senderWallet: wallet(`medium-sender-${index}`),
      receiverWallet: wallet(`medium-receiver-${index}`),
      senderBalanceBefore: (Number(amount) + 2500).toFixed(2),
      occurredAt: at(now, index + 1, 14, 10 * index),
    },
    assessment: {
      riskScore: Number((0.48 + index * 0.07).toFixed(2)),
      tier: "MEDIUM",
      action: "ALLOW_AND_REVIEW",
      tags: [],
      reasons: ["Model score above review threshold; no rule fired"],
      evidence: null,
      modelVersion: MODEL_VERSION,
      latencyMs: 33 + index,
    },
  };
}

/**
 * The full dataset: 52 transactions.
 *  - 24 LOW normal (20 generic + 4 inbound legs for the pass-throughs)
 *  - 4 HIGH pass-through cash-outs
 *  - 5 HIGH takeover drains
 *  - 17 HIGH split-chain transfers (5 chains, 3/3/3/4/4)
 *  - 2 MEDIUM model-score-only
 */
export function buildSeedRows(now: Date = new Date()): SeedRow[] {
  const rows: SeedRow[] = [];

  for (let i = 1; i <= 20; i += 1) {
    rows.push(lowNormal(now, i, `${SEED_PREFIX}norm_${pad(i)}`));
  }

  const inboundSpecs: Array<[string, number, number]> = [
    ["2500.00", 3, 10],
    ["3200.00", 5, 13],
    ["4800.00", 2, 16],
    ["1900.00", 6, 9],
  ];
  inboundSpecs.forEach(([amount, days, hour], i) => {
    const leg = inboundLeg(now, i + 1, amount, days, hour);
    rows.push(leg);
    rows.push(passThrough(i + 1, amount, leg.tx.id, leg.tx.occurredAt));
  });

  const drainBalances = [
    "12400.00",
    "8600.00",
    "15250.00",
    "4300.00",
    "9900.00",
  ];
  drainBalances.forEach((balance, i) => {
    rows.push(takeoverDrain(now, i + 1, balance));
  });

  rows.push(...splitChains(now));

  rows.push(mediumScoreOnly(now, 1));
  rows.push(mediumScoreOnly(now, 2));

  return rows;
}
