import { describe, expect, it } from "vitest";

import {
  RulesPackSchema,
  collectHistoryWindows,
  requiredHistoryWindow,
  type Rule,
} from "@/lib/engine";

function pack(rules: Array<Partial<Rule>>) {
  return RulesPackSchema.parse({
    schemaVersion: 1,
    name: "p",
    tierActions: { LOW: "ALLOW", MEDIUM: "REVIEW", HIGH: "HOLD_AND_ALERT" },
    rules: rules.map((r, i) => ({
      id: `r${i + 1}`,
      tag: "T",
      label: "L",
      enabled: true,
      severity: "MEDIUM",
      reason: "x",
      when: { all: [] },
      ...r,
    })),
  });
}

describe("requiredHistoryWindow", () => {
  it("is 0 when no rule uses history", () => {
    const p = pack([{ when: { all: [{ field: "amount", op: "gt", value: 0 }] } }]);
    expect(requiredHistoryWindow(p)).toBe(0);
  });

  it("is the max window over enabled rules", () => {
    const p = pack([
      { when: { all: [{ history: { scope: "pair", window_minutes: 60, metric: "count" }, op: "gte", value: 1 }] } },
      { when: { all: [{ history: { scope: "sender_outgoing", window_minutes: 10080, metric: "count" }, op: "gte", value: 1 }] } },
    ]);
    expect(requiredHistoryWindow(p)).toBe(10080);
  });

  it("ignores disabled rules", () => {
    const p = pack([
      { enabled: false, when: { all: [{ history: { scope: "pair", window_minutes: 10080, metric: "count" }, op: "gte", value: 1 }] } },
      { when: { all: [{ history: { scope: "pair", window_minutes: 60, metric: "count" }, op: "gte", value: 1 }] } },
    ]);
    expect(requiredHistoryWindow(p)).toBe(60);
  });
});

describe("collectHistoryWindows", () => {
  it("returns distinct scope/window pairs", () => {
    const p = pack([
      { when: { all: [{ history: { scope: "pair", window_minutes: 60, metric: "count" }, op: "gte", value: 1 }] } },
      { when: { all: [{ history: { scope: "pair", window_minutes: 60, metric: "sum_amount" }, op: "gte", value: 1 }] } },
      { when: { all: [{ history: { scope: "sender_incoming", window_minutes: 60, metric: "count" }, op: "gte", value: 1 }] } },
    ]);
    const windows = collectHistoryWindows(p);
    expect(windows).toHaveLength(2);
    expect(windows.map((w) => w.scope).sort()).toEqual(["pair", "sender_incoming"]);
  });
});
