// The pure scoring entry point (Task C). Given a canonical transaction, its
// history window, a rules pack and an optional model, it produces a fully
// explained assessment. Contains no I/O, so it is the same code path the API,
// the seed and the tests all exercise.

import { decide } from "./decide";
import type { HistoryWindow } from "./history";
import { scoreModel, type FeatureContribution } from "./model";
import { evaluateRules, type RuleHit, type SkippedRule } from "./rules";
import type { Action, ModelWeights, RulesPack, Tier } from "./schemas";
import type { CanonicalTransaction } from "./transaction";

export type ScoringMode = "MODEL_AND_RULES" | "RULES_ONLY";

export interface AssessInput {
  transaction: CanonicalTransaction;
  history: HistoryWindow;
  pack: RulesPack;
  model?: ModelWeights | null;
}

export interface AssessResult {
  mode: ScoringMode;
  /** Model probability, or null in RULES_ONLY mode (rendered as "—"). */
  riskScore: number | null;
  tier: Tier;
  action: Action;
  tags: string[];
  /** Fired rules with automatic evidence (one per tag, highest severity). */
  reasons: RuleHit[];
  /** Per-feature model contributions sorted by absolute contribution. */
  contributions: FeatureContribution[];
  imputedFeatures: string[];
  skippedRules: SkippedRule[];
  modelVersion: string | null;
  historyAvailable: boolean;
  historyTruncated: boolean;
}

export function assess(input: AssessInput): AssessResult {
  const { transaction, history, pack, model } = input;

  const rules = evaluateRules(pack, transaction, history);
  const modelResult = model ? scoreModel(model, transaction) : null;
  const decision = decide(modelResult, rules.hits, pack);

  return {
    mode: model ? "MODEL_AND_RULES" : "RULES_ONLY",
    riskScore: modelResult ? modelResult.score : null,
    tier: decision.tier,
    action: decision.action,
    tags: decision.tags,
    reasons: decision.reasons,
    contributions: modelResult ? modelResult.contributions : [],
    imputedFeatures: modelResult ? modelResult.imputedFeatures : [],
    skippedRules: rules.skipped,
    modelVersion: model ? model.modelVersion : null,
    historyAvailable: history.available,
    historyTruncated: history.truncated,
  };
}
