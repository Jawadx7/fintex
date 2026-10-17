// Task C3: the decision layer (section 7). Combines the rule-derived tier with
// the optional model-derived tier. The final tier is the higher of the two
// (D5): a model can only escalate, never clear a rule that already fired.

import type { ModelResult } from "./model";
import { rulesTier, type RuleHit } from "./rules";
import {
  canonicalAction,
  maxTier,
  type Action,
  type RulesPack,
  type Tier,
} from "./schemas";

export interface Decision {
  tier: Tier;
  action: Action;
  /** Distinct tags of the fired rules, in pack order. */
  tags: string[];
  /** Fired rules (one per tag, highest severity). */
  reasons: RuleHit[];
}

export function decide(
  modelResult: ModelResult | null,
  hits: RuleHit[],
  pack: RulesPack
): Decision {
  const rulesTierValue = rulesTier(hits) ?? "LOW";
  const tier = modelResult
    ? maxTier(rulesTierValue, modelResult.tier)
    : rulesTierValue;

  return {
    tier,
    action: canonicalAction(pack.tierActions[tier]),
    tags: hits.map((hit) => hit.tag),
    reasons: hits,
  };
}
