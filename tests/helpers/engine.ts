import type {
  CanonicalTransaction,
  HistoryTransaction,
  HistoryWindow,
} from "@/lib/engine";

export const TX_TIME = new Date("2026-10-10T13:18:00Z");

export function makeTx(
  overrides: Partial<CanonicalTransaction> = {}
): CanonicalTransaction {
  return {
    type: "TRANSFER",
    amount: 100,
    currency: "GHS",
    senderWalletId: "wlt_sender",
    receiverWalletId: "wlt_receiver",
    senderBalanceBefore: null,
    receiverBalanceBefore: null,
    occurredAt: TX_TIME,
    attributes: {},
    ...overrides,
  };
}

export function makeHistory(
  rows: Array<Partial<HistoryTransaction>> = [],
  available = true,
  truncated = false
): HistoryWindow {
  return {
    transactions: rows.map((row) => ({
      type: "TRANSFER",
      amount: 100,
      senderWalletId: "wlt_sender",
      receiverWalletId: "wlt_receiver",
      occurredAt: new Date(TX_TIME.getTime() - 60_000),
      ...row,
    })),
    available,
    truncated,
  };
}
