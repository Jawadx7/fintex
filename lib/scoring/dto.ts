// Wire shapes for the public scoring API (POST /api/v1/score). Client-safe and
// Prisma-free: they reference the engine's own types.

import type {
  Action,
  FieldValue,
  Severity,
  Tier,
} from "@/lib/engine";

export interface ScoreReason {
  ruleId: string;
  tag: string;
  severity: Severity;
  message: string;
  evidence: Record<string, FieldValue>;
}

export interface ScoreContribution {
  feature: string;
  /** Transformed value x used in scoring. */
  value: number;
  z: number;
  contribution: number;
}

export interface ScoreSkippedRule {
  id: string;
  reason: "missing_field" | "type_mismatch";
  fields: string[];
}

export interface ScoreResponse {
  requestId: string;
  /** null when the caller requested `persist: false`. */
  transactionId: string | null;
  mode: "MODEL_AND_RULES" | "RULES_ONLY";
  riskScore: number | null;
  tier: Tier;
  action: Action;
  tags: string[];
  reasons: ScoreReason[];
  contributions: ScoreContribution[];
  imputedFeatures: string[];
  skippedRules: ScoreSkippedRule[];
  modelVersion: string | null;
  rulesVersion: number;
  historyAvailable: boolean;
  historyTruncated: boolean;
  latencyMs: number;
}

/** Standard error envelope used by every scoring/admin route. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
}
