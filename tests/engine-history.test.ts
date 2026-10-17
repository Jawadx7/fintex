import { describe, expect, it } from "vitest";

import {
  evaluateHistory,
  historyMetric,
  selectHistory,
  type HistorySelector,
  type HistoryTransaction,
} from "@/lib/engine";
import { makeHistory, makeTx, TX_TIME } from "./helpers/engine";

const MIN = 60_000;

const tx = makeTx({ senderWalletId: "S", receiverWalletId: "R" });

function row(overrides: Partial<HistoryTransaction>): HistoryTransaction {
  return {
    type: "TRANSFER",
    amount: 100,
    senderWalletId: "S",
    receiverWalletId: "R",
    occurredAt: new Date(TX_TIME.getTime() - 10 * MIN),
    ...overrides,
  };
}

describe("scopes", () => {
  const rows = [
    row({ senderWalletId: "S", receiverWalletId: "X" }), // sender_outgoing
    row({ senderWalletId: "X", receiverWalletId: "S" }), // sender_incoming
    row({ senderWalletId: "Y", receiverWalletId: "R" }), // receiver_incoming
    row({ senderWalletId: "S", receiverWalletId: "R" }), // pair + outgoing + receiver_incoming? no
    row({ senderWalletId: "R", receiverWalletId: "Z" }), // not in any scope (receiver_outgoing is gone)
  ];
  const history = makeHistory(rows);

  const scopeCount = (scope: HistorySelector["scope"], windowMinutes = 60) =>
    selectHistory(history, tx, { scope, window_minutes: windowMinutes, metric: "count" }).length;

  it("sender_outgoing matches prior sends by the sender", () => {
    expect(scopeCount("sender_outgoing")).toBe(2);
  });
  it("sender_incoming matches prior receipts by the sender", () => {
    expect(scopeCount("sender_incoming")).toBe(1);
  });
  it("receiver_incoming matches prior receipts by the receiver from anyone", () => {
    expect(scopeCount("receiver_incoming")).toBe(2);
  });
  it("pair matches only the exact sender->receiver pair", () => {
    expect(scopeCount("pair")).toBe(1);
  });
});

describe("window boundaries", () => {
  const history = makeHistory([
    row({ occurredAt: new Date(TX_TIME.getTime() - 60 * MIN) }), // exactly start: included
    row({ occurredAt: new Date(TX_TIME.getTime() - 60 * MIN - 1) }), // before start: excluded
    row({ occurredAt: new Date(TX_TIME.getTime() - 1) }), // inside
    row({ occurredAt: TX_TIME }), // current transaction: excluded (strictly before)
  ]);
  it("includes start, excludes current and earlier-than-window rows", () => {
    const matches = selectHistory(history, tx, {
      scope: "pair",
      window_minutes: 60,
      metric: "count",
    });
    expect(matches).toHaveLength(2);
  });
});

describe("filters and metrics", () => {
  const history = makeHistory([
    row({ amount: 100, senderWalletId: "S", receiverWalletId: "A" }),
    row({ amount: 200, senderWalletId: "S", receiverWalletId: "B" }),
    row({ amount: 300, senderWalletId: "S", receiverWalletId: "A" }),
  ]);

  it("count", () => {
    expect(
      evaluateHistory(history, tx, { scope: "sender_outgoing", window_minutes: 60, metric: "count" })
    ).toBe(3);
  });
  it("sum_amount", () => {
    expect(
      evaluateHistory(history, tx, { scope: "sender_outgoing", window_minutes: 60, metric: "sum_amount" })
    ).toBe(600);
  });
  it("distinct_counterparties counts distinct receivers for outgoing", () => {
    expect(
      evaluateHistory(history, tx, { scope: "sender_outgoing", window_minutes: 60, metric: "distinct_counterparties" })
    ).toBe(2);
  });
  it("filter by type and amount band", () => {
    const matches = selectHistory(history, tx, {
      scope: "sender_outgoing",
      window_minutes: 60,
      metric: "count",
      filter: { amount_gte: 150, amount_lte: 300 },
    });
    expect(matches).toHaveLength(2);
    expect(historyMetric(matches, "sum_amount", "sender_outgoing")).toBe(500);
  });

  it("returns null when history is unavailable", () => {
    expect(
      evaluateHistory(makeHistory([], false), tx, {
        scope: "pair",
        window_minutes: 60,
        metric: "count",
      })
    ).toBeNull();
  });
});
