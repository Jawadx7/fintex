import { describe, expect, it } from "vitest";

import {
  ModelWeightsSchema,
  scoreModel,
  sigmoid,
  type ModelWeights,
} from "@/lib/engine";
import { makeTx } from "./helpers/engine";

function weights(partial: Partial<ModelWeights>): ModelWeights {
  return ModelWeightsSchema.parse({
    schemaVersion: 1,
    modelType: "logistic_regression",
    modelVersion: "test",
    intercept: 0,
    thresholds: { medium: 0.3, high: 0.7 },
    metadata: {},
    ...partial,
  });
}

describe("transforms", () => {
  it("identity passes the numeric value through", () => {
    const w = weights({
      features: [
        { name: "f", source: "amount", transform: { type: "identity" }, coefficient: 1, mean: 0, std: 1 },
      ],
    });
    const result = scoreModel(w, makeTx({ amount: 42 }));
    expect(result.contributions[0].x).toBe(42);
    expect(result.contributions[0].z).toBe(42);
  });

  it("log1p computes ln(1+x)", () => {
    const w = weights({
      features: [
        { name: "f", source: "amount", transform: { type: "log1p" }, coefficient: 1, mean: 0, std: 1 },
      ],
    });
    const result = scoreModel(w, makeTx({ amount: 3195 }));
    expect(result.contributions[0].x).toBeCloseTo(Math.log1p(3195));
  });

  it("onehot is 1 on match, 0 otherwise", () => {
    const w = weights({
      features: [
        { name: "f", source: "type", transform: { type: "onehot", value: "TRANSFER" }, coefficient: 1, mean: 0, std: 1 },
      ],
    });
    expect(scoreModel(w, makeTx({ type: "TRANSFER" })).contributions[0].x).toBe(1);
    expect(scoreModel(w, makeTx({ type: "CASH_OUT" })).contributions[0].x).toBe(0);
  });

  it("cyclic_sin and cyclic_cos use 2πx/period", () => {
    const sin = weights({
      features: [
        { name: "f", source: "derived.hourOfDay", transform: { type: "cyclic_sin", period: 24 }, coefficient: 1, mean: 0, std: 1 },
      ],
    });
    expect(scoreModel(sin, makeTx()).contributions[0].x).toBeCloseTo(
      Math.sin((2 * Math.PI * 13) / 24)
    );
    const cos = weights({
      features: [
        { name: "f", source: "derived.hourOfDay", transform: { type: "cyclic_cos", period: 24 }, coefficient: 1, mean: 0, std: 1 },
      ],
    });
    expect(scoreModel(cos, makeTx()).contributions[0].x).toBeCloseTo(
      Math.cos((2 * Math.PI * 13) / 24)
    );
  });

  it("clip clamps to [min,max]", () => {
    const w = weights({
      features: [
        { name: "f", source: "attributes.sim_swap_days", transform: { type: "clip", min: 0, max: 30 }, coefficient: 1, mean: 0, std: 1 },
      ],
    });
    expect(
      scoreModel(w, makeTx({ attributes: { sim_swap_days: 99 } })).contributions[0].x
    ).toBe(30);
    expect(
      scoreModel(w, makeTx({ attributes: { sim_swap_days: -5 } })).contributions[0].x
    ).toBe(0);
  });

  it("gte is 1 when x >= value else 0", () => {
    const w = weights({
      features: [
        { name: "f", source: "amount", transform: { type: "gte", value: 100 }, coefficient: 1, mean: 0, std: 1 },
      ],
    });
    expect(scoreModel(w, makeTx({ amount: 100 })).contributions[0].x).toBe(1);
    expect(scoreModel(w, makeTx({ amount: 99.99 })).contributions[0].x).toBe(0);
  });
});

describe("standardisation and logit", () => {
  it("reproduces the logit and score from contributions", () => {
    const w = weights({
      intercept: -4.2,
      features: [
        { name: "amount_log", source: "amount", transform: { type: "log1p" }, coefficient: 0.8, mean: 6.1, std: 1.9 },
        { name: "is_transfer", source: "type", transform: { type: "onehot", value: "TRANSFER" }, coefficient: 0.6, mean: 0.3, std: 0.46 },
      ],
    });
    const result = scoreModel(w, makeTx({ amount: 3195, type: "TRANSFER" }));
    const sum = result.contributions.reduce((s, c) => s + c.contribution, 0);
    expect(result.logit).toBeCloseTo(w.intercept + sum, 1e-9);
    expect(result.score).toBeCloseTo(sigmoid(result.logit), 1e-9);
    for (const c of result.contributions) {
      expect(c.contribution).toBeCloseTo(c.coefficient * c.z, 1e-12);
    }
  });

  it("sorts contributions by absolute contribution descending", () => {
    const w = weights({
      features: [
        { name: "a", source: "amount", transform: { type: "identity" }, coefficient: 0.1, mean: 0, std: 1 },
        { name: "b", source: "derived.hourOfDay", transform: { type: "identity" }, coefficient: 5, mean: 0, std: 1 },
      ],
    });
    const result = scoreModel(w, makeTx({ amount: 1 }));
    const abs = result.contributions.map((c) => Math.abs(c.contribution));
    expect(abs[0]).toBeGreaterThanOrEqual(abs[1]);
  });
});

describe("missing and imputation", () => {
  it("uses the post-transform `missing` value when the source is absent", () => {
    const w = weights({
      features: [
        { name: "recent_sim_swap", source: "attributes.sim_swap_days", transform: { type: "clip", min: 0, max: 30 }, coefficient: -0.05, mean: 20, std: 9, missing: 30 },
      ],
    });
    const result = scoreModel(w, makeTx());
    expect(result.contributions[0].x).toBe(30);
    expect(result.imputedFeatures).toContain("recent_sim_swap");
  });

  it("imputes the mean (z=0) when no `missing` is given", () => {
    const w = weights({
      features: [
        { name: "f", source: "sender.balanceBefore", transform: { type: "log1p" }, coefficient: 1, mean: 6, std: 2 },
      ],
    });
    const result = scoreModel(w, makeTx({ senderBalanceBefore: null }));
    expect(result.contributions[0].x).toBe(6);
    expect(result.contributions[0].z).toBe(0);
    expect(result.contributions[0].contribution).toBe(0);
    expect(result.imputedFeatures).toContain("f");
  });

  it("treats onehot on a missing source as missing", () => {
    const w = weights({
      features: [
        { name: "f", source: "attributes.new_device", transform: { type: "onehot", value: true }, coefficient: 1, mean: 0.5, std: 0.5 },
      ],
    });
    const result = scoreModel(w, makeTx());
    expect(result.imputedFeatures).toContain("f");
    expect(result.contributions[0].x).toBe(0.5);
  });

  it("treats a non-numeric source under a numeric transform as missing", () => {
    const w = weights({
      features: [
        { name: "f", source: "attributes.channel", transform: { type: "log1p" }, coefficient: 1, mean: 1, std: 1 },
      ],
    });
    const result = scoreModel(w, makeTx({ attributes: { channel: "USSD" } }));
    expect(result.imputedFeatures).toContain("f");
  });
});
