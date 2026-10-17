// Task C3: the (optional) logistic-regression model. Weights are a versioned,
// per-tenant document; scoring resolves each feature's source, applies its
// transform, standardises with the training mean/std, and combines the signed
// contributions through a sigmoid. Missing values are imputed and reported (D9).
//
// The model sees the transaction only (D1) — never history.

import type { ModelFeature, ModelWeights, Transform } from "./schemas";
import { tierFromScore, type Tier } from "./schemas";
import {
  resolveField,
  type CanonicalTransaction,
  type FieldValue,
} from "./transaction";

export interface FeatureContribution {
  feature: string;
  source: string;
  /** The raw resolved source value (may be null when imputed). */
  raw: FieldValue;
  /** The transformed value x used in scoring. */
  x: number;
  /** Standardised value z = (x - mean) / std. */
  z: number;
  coefficient: number;
  contribution: number;
}

export interface ModelResult {
  /** Sigmoid of the linear combination, in (0, 1). */
  score: number;
  /** The raw linear combination before the sigmoid. */
  logit: number;
  tier: Tier;
  /** Contributions, sorted by absolute contribution (descending). */
  contributions: FeatureContribution[];
  imputedFeatures: string[];
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function needsNumber(transform: Transform): boolean {
  return transform.type !== "onehot";
}

/** Apply a transform to a resolved value. Assumes the value is usable. */
export function applyTransform(
  transform: Transform,
  value: FieldValue
): number {
  switch (transform.type) {
    case "identity":
      return value as number;
    case "log1p":
      return Math.log1p(Math.max(0, value as number));
    case "onehot":
      return value === transform.value ? 1 : 0;
    case "cyclic_sin":
      return Math.sin((2 * Math.PI * (value as number)) / transform.period);
    case "cyclic_cos":
      return Math.cos((2 * Math.PI * (value as number)) / transform.period);
    case "clip":
      return Math.min(Math.max(value as number, transform.min), transform.max);
    case "gte":
      return (value as number) >= transform.value ? 1 : 0;
  }
}

function usable(feature: ModelFeature, value: FieldValue): boolean {
  if (value === null || value === undefined) return false;
  if (needsNumber(feature.transform) && typeof value !== "number") return false;
  if (typeof value === "number" && !Number.isFinite(value)) return false;
  return true;
}

export function scoreModel(
  weights: ModelWeights,
  tx: CanonicalTransaction
): ModelResult {
  let logit = weights.intercept;
  const contributions: FeatureContribution[] = [];
  const imputed: string[] = [];

  for (const feature of weights.features) {
    const raw = resolveField(feature.source, tx);
    let x: number;

    if (usable(feature, raw)) {
      x = applyTransform(feature.transform, raw);
    } else {
      // Impute: post-transform value when provided, else the training mean.
      x = feature.missing !== undefined ? feature.missing : feature.mean;
      imputed.push(feature.name);
    }

    const z = (x - feature.mean) / feature.std;
    const contribution = feature.coefficient * z;
    logit += contribution;
    contributions.push({
      feature: feature.name,
      source: feature.source,
      raw,
      x,
      z,
      coefficient: feature.coefficient,
      contribution,
    });
  }

  contributions.sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );

  const score = sigmoid(logit);
  return {
    score,
    logit,
    tier: tierFromScore(score, weights.thresholds),
    contributions,
    imputedFeatures: imputed.sort(),
  };
}
