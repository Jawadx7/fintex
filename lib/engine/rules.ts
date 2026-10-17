// Task C2: declarative rule evaluation (section 6).
//
// Rules are data, never code. Every field path a rule references is "required"
// (except paths under `exists`/`not_exists`): if any is missing, the whole rule
// is skipped and reported (`missing_field`). A value of the wrong type for a
// numeric operator skips with `type_mismatch`. Evidence is captured
// automatically: the resolved value of every field used, plus each computed
// history metric under `history.<scope>.<metric>.<window>m`.

import {
  evaluateHistory,
  historyEvidenceKey,
  type HistoryWindow,
} from "./history";
import {
  maxTier,
  TIER_ORDER,
  type Comparator,
  type Condition,
  type ConditionGroup,
  type FieldCondition,
  type HistoryCondition,
  type HistorySelector,
  type RulesPack,
  type Tier,
} from "./schemas";
import {
  resolveField,
  resolveValueRef,
  type CanonicalTransaction,
  type FieldValue,
} from "./transaction";

type CondResult = true | false | "unknown";

export type Evidence = Record<string, FieldValue>;

export interface RuleHit {
  id: string;
  tag: string;
  label: string;
  severity: Exclude<Tier, "LOW">;
  reason: string;
  evidence: Evidence;
}

export interface SkippedRule {
  id: string;
  reason: "missing_field" | "type_mismatch";
  fields: string[];
}

export interface RulesResult {
  hits: RuleHit[];
  skipped: SkippedRule[];
}

interface EvalOutcome {
  result: CondResult;
  evidence: Evidence;
  /** Referenced paths/facts that could not be resolved at all (missing). */
  missing: string[];
  /** Referenced paths whose value had the wrong type for the operator. */
  mismatch: string[];
}

function isHistoryCondition(
  condition: Condition
): condition is HistoryCondition {
  return "history" in condition;
}

function isFieldCondition(condition: Condition): condition is FieldCondition {
  return "field" in condition;
}

/** Resolve a literal number, or numeric valueRef; null when unusable. */
function resolveNumericExpected(
  condition: { value?: number; valueRef?: { field: string; factor?: number } },
  tx: CanonicalTransaction,
  mismatch: string[]
): number | null {
  if ("valueRef" in condition && condition.valueRef) {
    const resolved = resolveValueRef(tx, condition.valueRef);
    if (resolved === null) {
      mismatch.push(condition.valueRef.field);
      return null;
    }
    return resolved;
  }
  return condition.value ?? null;
}

function compareNumeric(
  op: Comparator,
  actual: number,
  expected: number
): boolean {
  switch (op) {
    case "gt":
      return actual > expected;
    case "gte":
      return actual >= expected;
    case "lt":
      return actual < expected;
    case "lte":
      return actual <= expected;
    default:
      return false;
  }
}

function evalFieldCondition(
  condition: FieldCondition,
  tx: CanonicalTransaction
): EvalOutcome {
  const actual = resolveField(condition.field, tx);
  const evidence: Evidence = { [condition.field]: actual };
  const mismatch: string[] = [];
  const missing: string[] = [];
  const op = condition.op;

  if (op === "exists") {
    return { result: actual !== null, evidence, missing, mismatch };
  }
  if (op === "not_exists") {
    return { result: actual === null, evidence, missing, mismatch };
  }

  if (op === "eq" || op === "neq") {
    const expected = (condition as { value: FieldValue }).value;
    return {
      result: op === "eq" ? actual === expected : actual !== expected,
      evidence,
      missing,
      mismatch,
    };
  }

  if (op === "in") {
    const expected = (condition as { value: Array<string | number> }).value;
    return {
      result:
        typeof actual === "string" || typeof actual === "number"
          ? expected.some((v) => v === actual)
          : false,
      evidence,
      missing,
      mismatch,
    };
  }

  // Numeric operator.
  if (typeof actual !== "number") {
    mismatch.push(condition.field);
    return { result: "unknown", evidence, missing, mismatch };
  }
  const expected = resolveNumericExpected(
    condition as { value?: number; valueRef?: { field: string; factor?: number } },
    tx,
    mismatch
  );
  if (expected === null) return { result: "unknown", evidence, missing, mismatch };
  return { result: compareNumeric(op, actual, expected), evidence, missing, mismatch };
}

function evalHistoryCondition(
  condition: HistoryCondition,
  tx: CanonicalTransaction,
  history: HistoryWindow
): EvalOutcome {
  const selector = condition.history;
  const key = historyEvidenceKey(selector);
  const metric = history.available
    ? evaluateHistory(history, tx, selector)
    : null;
  const evidence: Evidence = { [key]: metric };
  const mismatch: string[] = [];
  const missing: string[] = [];

  if (metric === null) {
    missing.push(key);
    return { result: "unknown", evidence, missing, mismatch };
  }

  const expected = resolveNumericExpected(
    condition as { value?: number; valueRef?: { field: string; factor?: number } },
    tx,
    mismatch
  );
  if (expected === null) {
    return { result: "unknown", evidence, missing, mismatch };
  }

  return {
    result: compareNumeric(condition.op, metric, expected),
    evidence,
    missing,
    mismatch,
  };
}

function combine(mode: "all" | "any", results: CondResult[]): CondResult {
  if (mode === "all") {
    if (results.some((r) => r === false)) return false;
    if (results.some((r) => r === "unknown")) return "unknown";
    return true;
  }
  if (results.some((r) => r === true)) return true;
  if (results.some((r) => r === "unknown")) return "unknown";
  return false;
}

function evalCondition(
  condition: Condition,
  tx: CanonicalTransaction,
  history: HistoryWindow
): EvalOutcome {
  if (isHistoryCondition(condition)) {
    return evalHistoryCondition(condition, tx, history);
  }
  if (isFieldCondition(condition)) {
    return evalFieldCondition(condition, tx);
  }
  const group = condition as ConditionGroup;
  const children = group.all ?? group.any ?? [];
  const mode = group.all ? "all" : "any";
  const outcomes = children.map((child) => evalCondition(child, tx, history));
  const result = combine(
    mode,
    outcomes.map((o) => o.result)
  );
  const kept =
    mode === "any" && result === true
      ? outcomes.filter((o) => o.result === true)
      : outcomes;
  return {
    result,
    evidence: Object.assign({}, ...kept.map((o) => o.evidence)),
    missing: kept.flatMap((o) => o.missing),
    mismatch: kept.flatMap((o) => o.mismatch),
  };
}

/** Collect every field path a condition references (except existence checks). */
function collectRequiredFields(
  condition: Condition,
  out: Set<string>
): void {
  if (isHistoryCondition(condition)) {
    if ("valueRef" in condition && condition.valueRef) {
      out.add(condition.valueRef.field);
    }
    return;
  }
  if (isFieldCondition(condition)) {
    if (condition.op !== "exists" && condition.op !== "not_exists") {
      out.add(condition.field);
    }
    if ("valueRef" in condition && condition.valueRef) {
      out.add(condition.valueRef.field);
    }
    return;
  }
  const group = condition as ConditionGroup;
  for (const child of group.all ?? group.any ?? []) {
    collectRequiredFields(child, out);
  }
}

/**
 * Evaluate every enabled rule in a pack. Disabled rules are ignored entirely.
 */
export function evaluateRules(
  pack: RulesPack,
  tx: CanonicalTransaction,
  history: HistoryWindow
): RulesResult {
  const hits: RuleHit[] = [];
  const skipped: SkippedRule[] = [];

  for (const rule of pack.rules) {
    if (!rule.enabled) continue;

    // 1. Every referenced field must be resolvable (D9).
    const required = new Set<string>();
    collectRequiredFields(rule.when, required);
    const missing = Array.from(required).filter(
      (path) => resolveField(path, tx) === null
    );
    if (missing.length > 0) {
      skipped.push({ id: rule.id, reason: "missing_field", fields: missing });
      continue;
    }

    // 2. Evaluate.
    const outcome = evalCondition(rule.when, tx, history);

    if (outcome.missing.length > 0) {
      skipped.push({
        id: rule.id,
        reason: "missing_field",
        fields: Array.from(new Set(outcome.missing)),
      });
      continue;
    }
    if (outcome.mismatch.length > 0) {
      skipped.push({
        id: rule.id,
        reason: "type_mismatch",
        fields: Array.from(new Set(outcome.mismatch)),
      });
      continue;
    }
    if (outcome.result !== true) continue;

    hits.push({
      id: rule.id,
      tag: rule.tag,
      label: rule.label,
      severity: rule.severity,
      reason: rule.reason,
      evidence: outcome.evidence,
    });
  }

  // One hit per tag: keep the highest-severity hit for each tag (ties keep the
  // first, i.e. pack order).
  const bestByTag = new Map<string, RuleHit>();
  for (const hit of hits) {
    const existing = bestByTag.get(hit.tag);
    if (
      !existing ||
      TIER_ORDER.indexOf(hit.severity) > TIER_ORDER.indexOf(existing.severity)
    ) {
      bestByTag.set(hit.tag, hit);
    }
  }

  return { hits: Array.from(bestByTag.values()), skipped };
}

/** Highest severity among hits, or null when none fired. */
export function rulesTier(hits: RuleHit[]): Tier | null {
  let tier: Tier | null = null;
  for (const hit of hits) tier = maxTier(tier, hit.severity);
  return tier;
}
