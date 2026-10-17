import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ModelWeightsSchema, RulesPackSchema } from "@/lib/engine";

function readFixture(relative: string): unknown {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8")
  );
}

const SECTION_5_EXAMPLE = {
  schemaVersion: 1,
  modelType: "logistic_regression",
  modelVersion: "sample-a-2026-10-20",
  intercept: -4.2,
  features: [
    { name: "amount_log", source: "amount", transform: { type: "log1p" }, coefficient: 0.8, mean: 6.1, std: 1.9 },
    { name: "is_transfer", source: "type", transform: { type: "onehot", value: "TRANSFER" }, coefficient: 0.6, mean: 0.3, std: 0.46 },
    { name: "hour_sin", source: "derived.hourOfDay", transform: { type: "cyclic_sin", period: 24 }, coefficient: -0.2, mean: 0.0, std: 0.7 },
    { name: "recent_sim_swap", source: "attributes.sim_swap_days", transform: { type: "clip", min: 0, max: 30 }, coefficient: -0.05, mean: 20, std: 9, missing: 30 },
  ],
  thresholds: { medium: 0.3, high: 0.7 },
  metadata: { trainedOn: "PaySim (synthetic)", notes: "optional", metrics: { prAuc: 0.0 } },
};

const SECTION_6_1_EXAMPLE = {
  schemaVersion: 1,
  name: "default-pack",
  tierActions: { LOW: "ALLOW", MEDIUM: "REVIEW", HIGH: "HOLD_AND_ALERT" },
  rules: [
    {
      id: "full_balance_drain",
      tag: "FULL_BALANCE_DRAIN",
      label: "Full balance drain",
      enabled: true,
      severity: "HIGH",
      reason: "Account emptied in a single outbound transfer to a recipient with no prior history.",
      when: { all: [{ field: "amount", op: "gte", value: 100 }] },
    },
  ],
};

describe("section 5 weights conformance", () => {
  it("accepts the section 5 example file unchanged", () => {
    const parsed = ModelWeightsSchema.safeParse(SECTION_5_EXAMPLE);
    expect(parsed.success).toBe(true);
  });

  it("ships conformance-5.json as the section 5 example, verbatim", () => {
    const fixture = readFixture("../fixtures/weights/conformance-5.json");
    expect(fixture).toEqual(SECTION_5_EXAMPLE);
    expect(ModelWeightsSchema.safeParse(fixture).success).toBe(true);
  });

  it("ships sample-a.json with the section 5 example's features and thresholds", () => {
    const fixture = readFixture("../fixtures/weights/sample-a.json") as {
      metadata?: unknown;
    };
    const expected = SECTION_5_EXAMPLE as { metadata?: unknown };
    const strip = (o: { metadata?: unknown }) => {
      const { metadata: _metadata, ...rest } = o;
      return rest;
    };
    expect(strip(fixture)).toEqual(strip(expected));
  });

  it("accepts sample-b.json and telco-sample.json", () => {
    for (const f of ["sample-b.json", "telco-sample.json"]) {
      const parsed = ModelWeightsSchema.safeParse(
        readFixture(`../fixtures/weights/${f}`)
      );
      expect(parsed.success, f).toBe(true);
    }
  });

  it("rejects malformed weights files", () => {
    const base = SECTION_5_EXAMPLE;
    const bad: Array<[string, unknown]> = [
      ["schemaVersion", { ...base, schemaVersion: 2 }],
      ["modelType", { ...base, modelType: "random_forest" }],
      ["unknown key", { ...base, extra: 1 }],
      ["no features", { ...base, features: [] }],
      ["duplicate names", { ...base, features: [base.features[0], base.features[0]] }],
      ["std zero", { ...base, features: [{ ...base.features[0], std: 0 }] }],
      ["bad source", { ...base, features: [{ ...base.features[0], source: "sender.walletId" }] }],
      ["bad transform", { ...base, features: [{ ...base.features[0], transform: { type: "clip", min: 5, max: 1 } }] }],
      ["unknown transform", { ...base, features: [{ ...base.features[0], transform: { type: "sqrt" } }] }],
      ["unknown transform key", { ...base, features: [{ ...base.features[0], transform: { type: "log1p", extra: 1 } }] }],
      ["thresholds order", { ...base, thresholds: { medium: 0.8, high: 0.3 } }],
      ["modelVersion chars", { ...base, modelVersion: "bad version!" }],
    ];
    for (const [name, value] of bad) {
      expect(ModelWeightsSchema.safeParse(value).success, name).toBe(false);
    }
  });
});

describe("section 6 rules conformance", () => {
  it("accepts the section 6.1 example", () => {
    expect(RulesPackSchema.safeParse(SECTION_6_1_EXAMPLE).success).toBe(true);
  });

  it("accepts the shipped rule packs", () => {
    for (const f of [
      "default-pack.json",
      "strict-pack.json",
      "telco-pack.json",
      "conformance-6.1.json",
    ]) {
      const parsed = RulesPackSchema.safeParse(
        readFixture(`../fixtures/rules/${f}`)
      );
      expect(parsed.success, f).toBe(true);
    }
  });

  it("rejects malformed rule packs", () => {
    const base = SECTION_6_1_EXAMPLE;
    const rule = base.rules[0];
    const mk = (overrides: Record<string, unknown>) => ({
      ...base,
      rules: [{ ...rule, ...overrides }],
    });
    const bad: Array<[string, unknown]> = [
      ["severity LOW", mk({ severity: "LOW" })],
      ["id chars", mk({ id: "Bad Id" })],
      ["id too long", mk({ id: "a".repeat(41) })],
      ["reason too long", mk({ reason: "x".repeat(241) })],
      ["bad tag", mk({ tag: "lower" })],
      ["unknown op", mk({ when: { all: [{ field: "amount", op: "matches", value: 1 }] } })],
      ["unknown scope", mk({ when: { all: [{ history: { scope: "nope", window_minutes: 60, metric: "count" }, op: "gte", value: 1 }] } })],
      ["unknown metric", mk({ when: { all: [{ history: { scope: "pair", window_minutes: 60, metric: "median" }, op: "gte", value: 1 }] } })],
      ["window too big", mk({ when: { all: [{ history: { scope: "pair", window_minutes: 10081, metric: "count" }, op: "gte", value: 1 }] } })],
      ["window zero", mk({ when: { all: [{ history: { scope: "pair", window_minutes: 0, metric: "count" }, op: "gte", value: 1 }] } })],
      ["valueRef non-numeric", mk({ when: { all: [{ field: "amount", op: "gte", valueRef: { field: "type" } }] } })],
      ["in too long", mk({ when: { all: [{ field: "amount", op: "in", value: Array.from({ length: 21 }, (_, i) => i) }] } })],
      ["numeric op with string", mk({ when: { all: [{ field: "amount", op: "gte", value: "x" }] } })],
      ["unknown key", { ...base, extra: 1 }],
      ["unknown rule key", mk({ extra: 1 })],
      ["both all and any", mk({ when: { all: [], any: [] } })],
      ["duplicate ids", { ...base, rules: [rule, rule] }],
    ];
    for (const [name, value] of bad) {
      expect(RulesPackSchema.safeParse(value).success, name).toBe(false);
    }
  });

  it("rejects over-limit and over-nested conditions", () => {
    const base = SECTION_6_1_EXAMPLE;
    const rule = base.rules[0];
    const many = {
      ...base,
      rules: [
        {
          ...rule,
          when: {
            all: Array.from({ length: 12 }, () => ({ field: "amount", op: "gte", value: 1 })),
          },
        },
      ],
    };
    expect(RulesPackSchema.safeParse(many).success).toBe(true);

    const thirteen = {
      ...base,
      rules: [
        {
          ...rule,
          when: {
            all: [
              ...Array.from({ length: 12 }, () => ({ field: "amount", op: "gte", value: 1 })),
              { all: [{ field: "amount", op: "gte", value: 1 }] },
            ],
          },
        },
      ],
    };
    expect(RulesPackSchema.safeParse(thirteen).success).toBe(false);

    const deep = {
      ...base,
      rules: [
        {
          ...rule,
          when: {
            all: [
              {
                all: [
                  {
                    all: [
                      { all: [{ field: "amount", op: "gte", value: 1 }] },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    };
    expect(RulesPackSchema.safeParse(deep).success).toBe(false);
  });
});
