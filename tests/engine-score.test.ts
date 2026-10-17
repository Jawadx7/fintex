import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  RulesPackSchema,
  assess,
  sigmoid,
  type ModelWeights,
  type RulesPack,
} from "@/lib/engine";
import { makeHistory, makeTx, TX_TIME } from "./helpers/engine";

function readFixture(relative: string): unknown {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8")
  );
}

const defaultPack: RulesPack = RulesPackSchema.parse(
  readFixture("../fixtures/rules/default-pack.json")
);

function pack(rulesHex: string): RulesPack {
  return RulesPackSchema.parse(JSON.parse(rulesHex));
}

describe("assess decision layer", () => {
  const rulesOnly: RulesPack = pack(
    JSON.stringify({
      schemaVersion: 1,
      name: "p",
      tierActions: { LOW: "ALLOW", MEDIUM: "REVIEW", HIGH: "HOLD_AND_ALERT" },
      rules: [
        {
          id: "r",
          tag: "HOT",
          label: "hot",
          enabled: true,
          severity: "HIGH",
          reason: "x",
          when: { all: [{ field: "amount", op: "gte", value: 1000 }] },
        },
      ],
    })
  );

  const model: ModelWeights = {
    schemaVersion: 1,
    modelType: "logistic_regression",
    modelVersion: "m1",
    intercept: 3,
    features: [
      { name: "f", source: "amount", transform: { type: "identity" }, coefficient: 0.001, mean: 0, std: 1 },
    ],
    thresholds: { medium: 0.3, high: 0.7 },
    metadata: {},
  };

  it("rules-only high", () => {
    const result = assess({
      transaction: makeTx({ amount: 2000 }),
      history: makeHistory(),
      pack: rulesOnly,
      model: null,
    });
    expect(result.mode).toBe("RULES_ONLY");
    expect(result.tier).toBe("HIGH");
    expect(result.action).toBe("HOLD_AND_ALERT");
    expect(result.riskScore).toBeNull();
    expect(result.modelVersion).toBeNull();
    expect(result.contributions).toEqual([]);
  });

  it("model-only high, no rules fire", () => {
    const result = assess({
      transaction: makeTx({ amount: 0 }),
      history: makeHistory(),
      pack: pack(
        JSON.stringify({
          schemaVersion: 1,
          name: "empty",
          tierActions: { LOW: "ALLOW", MEDIUM: "REVIEW", HIGH: "HOLD_AND_ALERT" },
          rules: [],
        })
      ),
      model,
    });
    expect(result.mode).toBe("MODEL_AND_RULES");
    expect(result.tier).toBe("HIGH");
    expect(result.riskScore).toBeCloseTo(sigmoid(3));
    expect(result.modelVersion).toBe("m1");
  });

  it("both: final tier is the higher", () => {
    const mediumModel = { ...model, intercept: 0 };
    const result = assess({
      transaction: makeTx({ amount: 2000 }),
      history: makeHistory(),
      pack: rulesOnly,
      model: mediumModel,
    });
    expect(result.tier).toBe("HIGH");
  });

  it("neither: LOW with the pack's LOW action", () => {
    const result = assess({
      transaction: makeTx({ amount: 0 }),
      history: makeHistory(),
      pack: rulesOnly,
      model: null,
    });
    expect(result.tier).toBe("LOW");
    expect(result.action).toBe("ALLOW");
  });
});

describe("default pack scenarios", () => {
  it("fires full_balance_drain (HIGH) for a drain to a new recipient", () => {
    const result = assess({
      transaction: makeTx({
        type: "CASH_OUT",
        amount: 3195,
        senderBalanceBefore: 3200,
        receiverBalanceBefore: 0,
      }),
      history: makeHistory(),
      pack: defaultPack,
      model: null,
    });
    expect(result.tags).toContain("FULL_BALANCE_DRAIN");
    expect(result.tier).toBe("HIGH");
  });

  it("fires pass_through (HIGH) when inbound funding matches the outbound", () => {
    const result = assess({
      transaction: makeTx({ type: "CASH_OUT", amount: 1000 }),
      history: makeHistory([
        { senderWalletId: "Funder", receiverWalletId: "wlt_sender", amount: 1000, occurredAt: new Date(TX_TIME.getTime() - 5 * 60_000) },
      ]),
      pack: defaultPack,
      model: null,
    });
    expect(result.tags).toContain("PASS_THROUGH");
    expect(result.tier).toBe("HIGH");
  });

  it("fires rapid_sequence (MEDIUM) on a burst of outbound transfers", () => {
    const result = assess({
      transaction: makeTx({ amount: 100 }),
      history: makeHistory([
        { senderWalletId: "wlt_sender", receiverWalletId: "a", amount: 50, occurredAt: new Date(TX_TIME.getTime() - 60_000) },
        { senderWalletId: "wlt_sender", receiverWalletId: "b", amount: 50, occurredAt: new Date(TX_TIME.getTime() - 120_000) },
        { senderWalletId: "wlt_sender", receiverWalletId: "c", amount: 50, occurredAt: new Date(TX_TIME.getTime() - 180_000) },
      ]),
      pack: defaultPack,
      model: null,
    });
    expect(result.tags).toContain("RAPID_SEQUENCE");
    expect(result.tier).toBe("MEDIUM");
    expect(result.action).toBe("ALLOW_AND_REVIEW");
  });

  it("fires nothing on a normal transaction", () => {
    const result = assess({
      transaction: makeTx({ amount: 50, senderBalanceBefore: 5000 }),
      history: makeHistory(),
      pack: defaultPack,
      model: null,
    });
    expect(result.tags).toEqual([]);
    expect(result.tier).toBe("LOW");
  });
});
