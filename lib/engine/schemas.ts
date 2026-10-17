// Task C schema layer: the declarative, versioned documents the engine consumes.
// A RulesVersion.config is a RulesPack; a ModelVersion.weights is a ModelWeights.
// Both are validated here so a malformed pack is rejected before it can ever be
// activated for a tenant.
//
// The shapes follow Brief 4.1 sections 5 and 6 exactly. Optional carrier fields
// (`tags`) live on the pack/response, not here.

import { z } from "zod";

import {
  isNumericFieldPath,
  isValidFieldPath,
  ValueRefSchema,
} from "./transaction";

export const TierSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const SeveritySchema = z.enum(["MEDIUM", "HIGH"]);

export type Tier = z.infer<typeof TierSchema>;
export type Severity = z.infer<typeof SeveritySchema>;

/** Ordered tiers, lowest to highest, for max() style comparisons. */
export const TIER_ORDER: Tier[] = ["LOW", "MEDIUM", "HIGH"];

export function maxTier(a: Tier | null, b: Tier): Tier {
  if (a === null) return b;
  return TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b) ? a : b;
}

// The existing RiskAction enum, plus the brief's `REVIEW` literal which is
// accepted as an alias for ALLOW_AND_REVIEW (section 6.1 example). The alias is
// normalised before persistence so the stored enum stays unchanged.
export const CANONICAL_ACTIONS = [
  "ALLOW",
  "ALLOW_AND_REVIEW",
  "HOLD_AND_ALERT",
] as const;
export type Action = (typeof CANONICAL_ACTIONS)[number];

export const ActionSchema = z.enum([...CANONICAL_ACTIONS, "REVIEW"]);

export function canonicalAction(action: z.infer<typeof ActionSchema>): Action {
  return action === "REVIEW" ? "ALLOW_AND_REVIEW" : action;
}

/**
 * Tags are free-form (data-agnostic), not a closed enum: a tenant may define any
 * pattern name. Bounded to an uppercase identifier so it is safe in URLs,
 * badges and DB text columns.
 */
export const TAG_PATTERN = /^[A-Z][A-Z0-9_]{0,39}$/;
export const TagSchema = z
  .string()
  .regex(TAG_PATTERN, "tag must be an uppercase identifier (A-Z, 0-9, _)");

export const RULE_ID_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;

// ---------------------------------------------------------------------------
// Section 5: weights schema
// ---------------------------------------------------------------------------

const TransformSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("identity") }).strict(),
  z.object({ type: z.literal("log1p") }).strict(),
  z
    .object({
      type: z.literal("onehot"),
      value: z.union([z.string(), z.number().finite(), z.boolean()]),
    })
    .strict(),
  z
    .object({ type: z.literal("cyclic_sin"), period: z.number().finite().positive() })
    .strict(),
  z
    .object({ type: z.literal("cyclic_cos"), period: z.number().finite().positive() })
    .strict(),
  z
    .object({
      type: z.literal("clip"),
      min: z.number().finite(),
      max: z.number().finite(),
    })
    .strict()
    .refine((t) => t.min <= t.max, "clip min must be <= max"),
  z
    .object({ type: z.literal("gte"), value: z.number().finite() })
    .strict(),
]);

export type Transform = z.infer<typeof TransformSchema>;

const FeatureSchema = z
  .object({
    name: z
      .string()
      .regex(/^[a-z][a-z0-9_]{0,39}$/, "feature name must be lower_snake_case"),
    source: z
      .string()
      .refine(isValidFieldPath, "source must be a valid field path"),
    transform: TransformSchema,
    coefficient: z.number().finite(),
    mean: z.number().finite(),
    std: z.number().finite().positive(),
    missing: z.number().finite().optional(),
  })
  .strict();

export type ModelFeature = z.infer<typeof FeatureSchema>;

const ThresholdsSchema = z
  .object({
    medium: z.number().min(0).max(1),
    high: z.number().min(0).max(1),
  })
  .strict()
  .refine(
    (t) => t.medium > 0 && t.medium < t.high && t.high < 1,
    "thresholds must satisfy 0 < medium < high < 1"
  );

/** A versioned logistic-regression model (stored as ModelVersion.weights). */
export const ModelWeightsSchema = z
  .object({
    schemaVersion: z.literal(1),
    modelType: z.literal("logistic_regression"),
    modelVersion: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9._-]+$/, "modelVersion has invalid characters"),
    intercept: z.number().finite(),
    features: z.array(FeatureSchema).min(1).max(50),
    thresholds: ThresholdsSchema,
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .refine(
    (m) => new Set(m.features.map((f) => f.name)).size === m.features.length,
    { message: "feature names must be unique", path: ["features"] }
  );

export type ModelWeights = z.infer<typeof ModelWeightsSchema>;

/** Tier from a model score and its thresholds (section 5). */
export function tierFromScore(
  score: number,
  thresholds: ModelWeights["thresholds"]
): Tier {
  if (score >= thresholds.high) return "HIGH";
  if (score >= thresholds.medium) return "MEDIUM";
  return "LOW";
}

// ---------------------------------------------------------------------------
// Section 6: rules pack
// ---------------------------------------------------------------------------

const NumericOpSchema = z.enum(["gte", "gt", "lte", "lt"]);
const EqualityOpSchema = z.enum(["eq", "neq"]);
const ExistenceOpSchema = z.enum(["exists", "not_exists"]);
const HistoryOpSchema = NumericOpSchema;

export const ComparatorSchema = z.enum([
  "gte",
  "gt",
  "lte",
  "lt",
  "eq",
  "neq",
  "in",
  "exists",
  "not_exists",
]);
export type Comparator = z.infer<typeof ComparatorSchema>;

export const HistoryScopeSchema = z.enum([
  "sender_outgoing",
  "sender_incoming",
  "receiver_incoming",
  "pair",
]);
export type HistoryScope = z.infer<typeof HistoryScopeSchema>;

export const HistoryMetricSchema = z.enum([
  "count",
  "sum_amount",
  "distinct_counterparties",
]);
export type HistoryMetric = z.infer<typeof HistoryMetricSchema>;

const PrimitiveSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
]);

export const HistorySelectorSchema = z
  .object({
    scope: HistoryScopeSchema,
    window_minutes: z.number().int().min(1).max(10080),
    metric: HistoryMetricSchema,
    filter: z
      .object({
        types: z
          .array(z.enum(["TRANSFER", "CASH_OUT"]))
          .min(1)
          .optional(),
        amount_gte: z.number().finite().optional(),
        amount_lte: z.number().finite().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type HistorySelector = z.infer<typeof HistorySelectorSchema>;

const FieldPathSchema = z
  .string()
  .refine(isValidFieldPath, "unknown field path");

const NumericValueRefSchema = ValueRefSchema.refine(
  (r) => r.field === "amount" || isNumericFieldPath(r.field),
  "valueRef.field must be a numeric path"
);

const FieldConditionSchema = z.union([
  z
    .object({ field: FieldPathSchema, op: ExistenceOpSchema })
    .strict(),
  z
    .object({
      field: FieldPathSchema,
      op: EqualityOpSchema,
      value: PrimitiveSchema,
    })
    .strict(),
  z
    .object({
      field: FieldPathSchema,
      op: NumericOpSchema,
      value: z.number().finite(),
    })
    .strict(),
  z
    .object({
      field: FieldPathSchema,
      op: NumericOpSchema,
      valueRef: NumericValueRefSchema,
    })
    .strict(),
  z
    .object({
      field: FieldPathSchema,
      op: z.literal("in"),
      value: z.array(z.union([z.string(), z.number().finite()])).min(1).max(20),
    })
    .strict(),
]);

const HistoryConditionSchema = z.union([
  z
    .object({
      history: HistorySelectorSchema,
      op: HistoryOpSchema,
      value: z.number().finite(),
    })
    .strict(),
  z
    .object({
      history: HistorySelectorSchema,
      op: HistoryOpSchema,
      valueRef: NumericValueRefSchema,
    })
    .strict(),
]);

export type FieldCondition = z.infer<typeof FieldConditionSchema>;
export type HistoryCondition = z.infer<typeof HistoryConditionSchema>;

export interface ConditionGroup {
  all?: Condition[];
  any?: Condition[];
}

export type Condition = FieldCondition | HistoryCondition | ConditionGroup;

const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([FieldConditionSchema, HistoryConditionSchema, ConditionGroupSchema])
);

const ConditionGroupSchema: z.ZodType<ConditionGroup> = z.lazy(() =>
  z
    .object({
      all: z.array(ConditionSchema).min(1).max(12).optional(),
      any: z.array(ConditionSchema).min(1).max(12).optional(),
    })
    .strict()
    .refine((g) => (g.all === undefined) !== (g.any === undefined), {
      message: "condition group must define exactly one of `all` or `any`",
    })
);

function walkConditions(
  group: ConditionGroup,
  visit: (condition: Condition, depth: number) => void,
  depth: number
): void {
  const children = group.all ?? group.any ?? [];
  for (const child of children) {
    visit(child, depth);
    if (!("field" in child) && !("history" in child)) {
      walkConditions(child as ConditionGroup, visit, depth + 1);
    }
  }
}

/** A single named, explainable rule within a pack. */
export const RuleSchema = z
  .object({
    id: z
      .string()
      .regex(RULE_ID_PATTERN, "rule id must be lower_snake_case, max 40 chars"),
    tag: TagSchema,
    label: z.string().min(1).max(120),
    enabled: z.boolean().default(true),
    severity: SeveritySchema,
    reason: z.string().min(1).max(240),
    when: ConditionGroupSchema,
  })
  .strict()
  .superRefine((rule, ctx) => {
    let count = 0;
    let maxDepth = 0;
    walkConditions(
      rule.when,
      (_condition, depth) => {
        count += 1;
        maxDepth = Math.max(maxDepth, depth);
      },
      1
    );
    if (count > 12) {
      ctx.addIssue({
        code: "custom",
        path: ["when"],
        message: "a rule may use at most 12 conditions",
      });
    }
    if (maxDepth > 3) {
      ctx.addIssue({
        code: "custom",
        path: ["when"],
        message: "condition nesting depth must be <= 3",
      });
    }
  });

export type Rule = z.infer<typeof RuleSchema>;

export const TierActionsSchema = z
  .object({
    LOW: ActionSchema,
    MEDIUM: ActionSchema,
    HIGH: ActionSchema,
  })
  .strict();

export type TierActions = z.infer<typeof TierActionsSchema>;

/** A versioned, declarative rules pack (stored as RulesVersion.config). */
export const RulesPackSchema = z
  .object({
    schemaVersion: z.literal(1),
    name: z.string().min(1).max(120),
    tierActions: TierActionsSchema,
    rules: z.array(RuleSchema).max(50),
  })
  .strict()
  .refine(
    (p) => new Set(p.rules.map((r) => r.id)).size === p.rules.length,
    { message: "rule ids must be unique", path: ["rules"] }
  );

export type RulesPack = z.infer<typeof RulesPackSchema>;
