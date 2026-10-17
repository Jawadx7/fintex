import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ModelWeightsSchema,
  RulesPackSchema,
  assess,
  type ModelWeights,
  type RulesPack,
} from "@/lib/engine";
import { makeHistory, makeTx } from "./helpers/engine";

function fixture(relative: string): unknown {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8")
  );
}

const defaultPack: RulesPack = RulesPackSchema.parse(
  fixture("../fixtures/rules/default-pack.json")
);
const strictPack: RulesPack = RulesPackSchema.parse(
  fixture("../fixtures/rules/strict-pack.json")
);
const telcoPack: RulesPack = RulesPackSchema.parse(
  fixture("../fixtures/rules/telco-pack.json")
);
const sampleA: ModelWeights = ModelWeightsSchema.parse(
  fixture("../fixtures/weights/sample-a.json")
);
const sampleB: ModelWeights = ModelWeightsSchema.parse(
  fixture("../fixtures/weights/sample-b.json")
);
const telcoSample: ModelWeights = ModelWeightsSchema.parse(
  fixture("../fixtures/weights/telco-sample.json")
);

const EMPTY_PACK = RulesPackSchema.parse({
  schemaVersion: 1,
  name: "empty",
  tierActions: { LOW: "ALLOW", MEDIUM: "REVIEW", HIGH: "HOLD_AND_ALERT" },
  rules: [],
});

describe("rules swap", () => {
  const tx = makeTx({ type: "CASH_OUT", amount: 600, senderBalanceBefore: 5000 });

  it("flips the tier when the active pack changes, same transaction", () => {
    const before = assess({ transaction: tx, history: makeHistory(), pack: defaultPack, model: null });
    const after = assess({ transaction: tx, history: makeHistory(), pack: strictPack, model: null });

    expect(before.tier).toBe("LOW");
    expect(after.tier).toBe("MEDIUM");
    expect(after.tags).toContain("LARGE_AMOUNT");
  });

  it("is reversible: switching back restores the original tier", () => {
    const first = assess({ transaction: tx, history: makeHistory(), pack: defaultPack, model: null });
    assess({ transaction: tx, history: makeHistory(), pack: strictPack, model: null });
    const back = assess({ transaction: tx, history: makeHistory(), pack: defaultPack, model: null });
    expect(back.tier).toBe(first.tier);
    expect(back.tags).toEqual(first.tags);
  });
});

describe("model swap and rollback", () => {
  const tx = makeTx({ type: "CASH_OUT", amount: 3195, senderBalanceBefore: 3200 });
  const args = { transaction: tx, history: makeHistory(), pack: EMPTY_PACK };

  it("changes the score when the active model changes", () => {
    const a = assess({ ...args, model: sampleA });
    const b = assess({ ...args, model: sampleB });
    expect(a.modelVersion).toBe("sample-a-2026-10-20");
    expect(b.modelVersion).not.toBe(a.modelVersion);
    expect(b.riskScore).not.toBe(a.riskScore);
  });

  it("rolls back to the previous model exactly", () => {
    const a1 = assess({ ...args, model: sampleA });
    assess({ ...args, model: sampleB });
    const a2 = assess({ ...args, model: sampleA });
    expect(a2.riskScore).toBe(a1.riskScore);
    expect(a2.modelVersion).toBe(a1.modelVersion);
    expect(a2.contributions).toEqual(a1.contributions);
  });

  it("drops to RULES_ONLY with no active model", () => {
    const rulesOnly = assess({ ...args, model: null });
    expect(rulesOnly.mode).toBe("RULES_ONLY");
    expect(rulesOnly.riskScore).toBeNull();
    expect(rulesOnly.modelVersion).toBeNull();
    expect(rulesOnly.contributions).toEqual([]);
  });
});

describe("data-agnostic (telco attributes)", () => {
  const args = { history: makeHistory(), pack: telcoPack, model: telcoSample };

  it("fires the rule and uses the feature when the attribute is present", () => {
    const result = assess({
      ...args,
      transaction: makeTx({
        type: "CASH_OUT",
        amount: 1500,
        attributes: { sim_swap_days: 2, new_device: true },
      }),
    });
    expect(result.tags).toContain("SIM_SWAP");
    expect(result.tier).toBe("HIGH");
    expect(result.imputedFeatures).not.toContain("recent_sim_swap");
    expect(result.imputedFeatures).not.toContain("new_device");
  });

  it("skips the rule and imputes the features when the attribute is absent — no error", () => {
    const withAttr = assess({
      ...args,
      transaction: makeTx({ type: "CASH_OUT", amount: 1500, attributes: { sim_swap_days: 2, new_device: true } }),
    });
    const withoutAttr = assess({
      ...args,
      transaction: makeTx({ type: "CASH_OUT", amount: 1500 }),
    });

    expect(withoutAttr.tags).not.toContain("SIM_SWAP");
    const skipped = withoutAttr.skippedRules.find((s) => s.id === "telco_sim_swap_new_device");
    expect(skipped?.reason).toBe("missing_field");
    expect(skipped?.fields).toEqual(
      expect.arrayContaining(["attributes.sim_swap_days", "attributes.new_device"])
    );
    expect(withoutAttr.imputedFeatures).toEqual(
      expect.arrayContaining(["recent_sim_swap", "new_device"])
    );
    // The attribute genuinely affects the score.
    expect(withoutAttr.riskScore).not.toBe(withAttr.riskScore);
  });
});

describe("history truncation propagation", () => {
  it("surfaces historyTruncated from the loaded window", () => {
    const result = assess({
      transaction: makeTx({ amount: 600, senderBalanceBefore: 5000 }),
      history: makeHistory([], true, true),
      pack: strictPack,
      model: null,
    });
    expect(result.historyAvailable).toBe(true);
    expect(result.historyTruncated).toBe(true);
  });

  it("marks history unavailable when the tenant has no history store", () => {
    const result = assess({
      transaction: makeTx(),
      history: makeHistory([], false),
      pack: defaultPack,
      model: null,
    });
    expect(result.historyAvailable).toBe(false);
  });
});
