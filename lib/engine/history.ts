// Pure history analytics. The DB-backed service (Task D) supplies a window of
// prior transactions; this module turns a declarative HistorySelector into a
// number. Kept dependency-free so rules and features share one implementation
// and it can be unit-tested against fixtures.
//
// History is passed in as plain arrays keyed exactly as the brief specifies
// (section 7): senderWalletId, receiverWalletId, amount, type, occurredAt.

import type { HistorySelector } from "./schemas";
import type {
  CanonicalTransaction,
  EngineTransactionType,
} from "./transaction";

export interface HistoryTransaction {
  /** Local transaction id, surfaced in evidence as a related transaction. */
  id?: string;
  type: EngineTransactionType;
  amount: number;
  senderWalletId: string;
  receiverWalletId: string;
  occurredAt: Date;
}

export interface HistoryWindow {
  /** Prior transactions; the engine filters by scope/window/filter. */
  transactions: HistoryTransaction[];
  /** False when the service could not load history (rules are skipped). */
  available: boolean;
  /** True when any scope was capped before the full window elapsed. */
  truncated: boolean;
}

export const EMPTY_HISTORY: HistoryWindow = {
  transactions: [],
  available: false,
  truncated: false,
};

const MINUTE_MS = 60 * 1000;

/** True when `tx` belongs to `scope` relative to the reference transaction. */
export function isInScope(
  tx: Pick<HistoryTransaction, "senderWalletId" | "receiverWalletId">,
  ref: Pick<CanonicalTransaction, "senderWalletId" | "receiverWalletId">,
  scope: HistorySelector["scope"]
): boolean {
  switch (scope) {
    case "pair":
      return (
        tx.senderWalletId === ref.senderWalletId &&
        tx.receiverWalletId === ref.receiverWalletId
      );
    case "sender_outgoing":
      return tx.senderWalletId === ref.senderWalletId;
    case "sender_incoming":
      return tx.receiverWalletId === ref.senderWalletId;
    case "receiver_incoming":
      return tx.receiverWalletId === ref.receiverWalletId;
  }
}

/** Prior transactions matching the selector's scope, window and filter. */
export function selectHistory(
  history: HistoryWindow,
  ref: CanonicalTransaction,
  selector: HistorySelector
): HistoryTransaction[] {
  const end = ref.occurredAt.getTime();
  const start = end - selector.window_minutes * MINUTE_MS;
  const filter = selector.filter;

  return history.transactions.filter((tx) => {
    const at = tx.occurredAt.getTime();
    // Window is [occurredAt - window, occurredAt): strictly before and the
    // current transaction itself is never included.
    if (at < start || at >= end) return false;
    if (!isInScope(tx, ref, selector.scope)) return false;
    if (filter?.types && !filter.types.includes(tx.type)) return false;
    if (filter?.amount_gte !== undefined && tx.amount < filter.amount_gte) {
      return false;
    }
    if (filter?.amount_lte !== undefined && tx.amount > filter.amount_lte) {
      return false;
    }
    return true;
  });
}

/**
 * Reduce the matching transactions to a metric. `distinct_counterparties`
 * counts distinct receivers for outgoing scopes and distinct senders for
 * incoming scopes.
 */
export function historyMetric(
  matches: HistoryTransaction[],
  metric: HistorySelector["metric"],
  scope: HistorySelector["scope"]
): number {
  switch (metric) {
    case "count":
      return matches.length;
    case "sum_amount":
      return matches.reduce((sum, tx) => sum + tx.amount, 0);
    case "distinct_counterparties": {
      const incoming =
        scope === "sender_incoming" || scope === "receiver_incoming";
      const parties = new Set(
        matches.map((tx) =>
          incoming ? tx.senderWalletId : tx.receiverWalletId
        )
      );
      return parties.size;
    }
  }
}

/**
 * Evaluate a history selector to a number. Returns null when history is
 * unavailable so the caller can skip the rule and report it (D9).
 */
export function evaluateHistory(
  history: HistoryWindow,
  ref: CanonicalTransaction,
  selector: HistorySelector
): number | null {
  if (!history.available) return null;
  return historyMetric(
    selectHistory(history, ref, selector),
    selector.metric,
    selector.scope
  );
}

/** Evidence key for a history metric, e.g. `history.pair.count.60m`. */
export function historyEvidenceKey(selector: HistorySelector): string {
  return `history.${selector.scope}.${selector.metric}.${selector.window_minutes}m`;
}
