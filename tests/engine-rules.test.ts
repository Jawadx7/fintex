import { describe, expect, it } from "vitest";

import {
  RulesPackSchema,
  evaluateRules,
  type RulesPack,
  type Rule,
} from "@/lib/engine";
import { makeHistory, makeTx } from "./helpers/engine";

function pack(rules: Array<Partial<Rule>>): RulesPack {
  return RulesPackSchema.parse({
    schemaVersion: 1,
    name: "test-pack",
    tierActions: { LOW: "ALLOW", MEDIUM: "REVIEW", HIGH: "HOLD_AND_ALERT" },
    rules: rules.map((r) => ({
      id: "r1",
      tag: "TAG_ONE",
      label: "Rule",
      enabled: true,
      severity: "MEDIUM",
      reason: "reason",
      when: { all: [] },
      ...r,
    })),
  });
}

describe("operators", () => {
  const cases: Array<[string, unknown, number, boolean]> = [
    ["gte", 100, 100, true],
    ["gt", 100, 100, false],
    ["lte", 100, 100, true],
    ["lt", 100, 100, false],
  ];
  it.each(cases)("%s at the boundary", (op, value, amount, expected) => {
    const p = pack([
      {
        when: {
          all: [{ field: "amount", op, value } as never],
        },
      },
    ]);
    const result = evaluateRules(p, makeTx({ amount }), makeHistory());
    expect(result.hits.length === 1).toBe(expected);
  });

  it("eq/neq compare primitives", () => {
    const eq = pack([{ when: { all: [{ field: "type", op: "eq", value: "TRANSFER" }] } }]);
    const neq = pack([{ when: { all: [{ field: "type", op: "neq", value: "TRANSFER" }] } }]);
    expect(evaluateRules(eq, makeTx({ type: "TRANSFER" }), makeHistory()).hits).toHaveLength(1);
    expect(evaluateRules(neq, makeTx({ type: "TRANSFER" }), makeHistory()).hits).toHaveLength(0);
  });

  it("in matches members of a literal array", () => {
    const p = pack([{ when: { all: [{ field: "type", op: "in", value: ["CASH_OUT", "TRANSFER"] }] } }]);
    expect(evaluateRules(p, makeTx({ type: "CASH_OUT" }), makeHistory()).hits).toHaveLength(1);
  });

  it("exists/not_exists test presence", () => {
    const exists = pack([{ when: { all: [{ field: "attributes.channel", op: "exists" }] } }]);
    const notExists = pack([{ when: { all: [{ field: "attributes.channel", op: "not_exists" }] } }]);
    expect(evaluateRules(exists, makeTx({ attributes: { channel: "USSD" } }), makeHistory()).hits).toHaveLength(1);
    expect(evaluateRules(exists, makeTx(), makeHistory()).hits).toHaveLength(0);
    expect(evaluateRules(notExists, makeTx(), makeHistory()).hits).toHaveLength(1);
  });

  it("supports valueRef with a factor", () => {
    const p = pack([
      { when: { all: [{ field: "amount", op: "gte", valueRef: { field: "sender.balanceBefore", factor: 0.95 } }] } },
    ]);
    expect(
      evaluateRules(p, makeTx({ amount: 3200, senderBalanceBefore: 3200 }), makeHistory()).hits
    ).toHaveLength(1);
    expect(
      evaluateRules(p, makeTx({ amount: 3000, senderBalanceBefore: 3200 }), makeHistory()).hits
    ).toHaveLength(0);
  });
});

describe("history conditions", () => {
  const historyRule: Partial<Rule> = {
    when: {
      all: [
        {
          history: { scope: "pair", window_minutes: 60, metric: "count" },
          op: "gte",
          value: 1,
        },
      ],
    },
  };

  it("fires when matching history exists and reports evidence", () => {
    const p = pack([historyRule]);
    const history = makeHistory([
      { senderWalletId: "wlt_sender", receiverWalletId: "wlt_receiver" },
    ]);
    const result = evaluateRules(p, makeTx(), history);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].evidence["history.pair.count.60m"]).toBe(1);
  });

  it("skips with missing_field when history is unavailable", () => {
    const p = pack([historyRule]);
    const result = evaluateRules(p, makeTx(), makeHistory([], false));
    expect(result.hits).toHaveLength(0);
    expect(result.skipped[0]).toMatchObject({
      id: "r1",
      reason: "missing_field",
    });
  });
});

describe("skips", () => {
  it("skips missing_field even when the missing field is inside `any`", () => {
    const p = pack([
      {
        when: {
          any: [
            { field: "attributes.absent", op: "eq", value: 1 },
            { field: "amount", op: "gt", value: 0 },
          ],
        },
      },
    ]);
    const result = evaluateRules(p, makeTx(), makeHistory());
    expect(result.hits).toHaveLength(0);
    expect(result.skipped[0]).toEqual({
      id: "r1",
      reason: "missing_field",
      fields: ["attributes.absent"],
    });
  });

  it("skips type_mismatch when a numeric op meets a string", () => {
    const p = pack([
      { when: { all: [{ field: "attributes.channel", op: "gte", value: 1 }] } },
    ]);
    const result = evaluateRules(p, makeTx({ attributes: { channel: "USSD" } }), makeHistory());
    expect(result.hits).toHaveLength(0);
    expect(result.skipped[0]).toMatchObject({ reason: "type_mismatch" });
    expect(result.skipped[0].fields).toContain("attributes.channel");
  });

  it("does not evaluate or report disabled rules", () => {
    const p = pack([{ enabled: false, when: { all: [{ field: "amount", op: "gt", value: 0 }] } }]);
    const result = evaluateRules(p, makeTx(), makeHistory());
    expect(result.hits).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });
});

describe("one hit per tag", () => {
  it("keeps the highest-severity hit for a shared tag", () => {
    const p = pack([
      { id: "lo", tag: "SHARED", severity: "MEDIUM", when: { all: [{ field: "amount", op: "gt", value: 0 }] } },
      { id: "hi", tag: "SHARED", severity: "HIGH", when: { all: [{ field: "amount", op: "gt", value: 0 }] } },
    ]);
    const result = evaluateRules(p, makeTx(), makeHistory());
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].id).toBe("hi");
  });
});
