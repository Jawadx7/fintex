import "server-only";

import type {
  CanonicalTransaction,
  HistoryScope,
  HistoryTransaction,
  HistoryWindow,
} from "@/lib/engine";
import { isInScope } from "@/lib/engine";
import { prisma } from "@/lib/prisma";

/** Hard cap on rows loaded per scope; exceeding it flags the window truncated. */
export const HISTORY_LIMIT_PER_SCOPE = 500;

export interface HistoryScopeQuery {
  scope: HistoryScope;
  windowMinutes: number;
}

export interface LoadHistoryOptions {
  tenantId: string;
  transaction: Pick<
    CanonicalTransaction,
    "senderWalletId" | "receiverWalletId" | "occurredAt"
  >;
  scopes: HistoryScopeQuery[];
  limitPerScope?: number;
}

/** Scopes whose rows are keyed on the sender wallet (one DB query). */
const SENDER_SCOPES: HistoryScope[] = [
  "sender_outgoing",
  "sender_incoming",
  "pair",
];

type HistoryRow = {
  id: string;
  type: string;
  amount: { toNumber(): number };
  senderWallet: string;
  receiverWallet: string;
  occurredAt: Date;
};

const ROW_SELECT = {
  id: true,
  type: true,
  amount: true,
  senderWallet: true,
  receiverWallet: true,
  occurredAt: true,
} as const;

function toHistoryTransaction(row: HistoryRow): HistoryTransaction {
  return {
    id: row.id,
    type: row.type as HistoryTransaction["type"],
    amount: row.amount.toNumber(),
    senderWalletId: row.senderWallet,
    receiverWalletId: row.receiverWallet,
    occurredAt: row.occurredAt,
  };
}

function minutesBefore(base: Date, minutes: number): Date {
  return new Date(base.getTime() - minutes * 60 * 1000);
}

/**
 * Load the prior transactions relevant to scoring `transaction`, in at most two
 * parallel queries (Task D perf). Sender-keyed scopes (`sender_outgoing`,
 * `sender_incoming`, `pair`) share one query; the receiver-keyed scope
 * (`receiver_incoming`) uses a second. The engine then applies each rule's own
 * scope/window/filter, so a shared superset is safe.
 *
 * `available` is false when no prior transaction was found for the sender or
 * receiver in any requested window — the engine then skips history rules and
 * reports them (D9). Hitting the per-scope cap flags the window `truncated`.
 */
export async function loadHistory(
  options: LoadHistoryOptions
): Promise<HistoryWindow> {
  const { tenantId, transaction, scopes } = options;
  const limit = options.limitPerScope ?? HISTORY_LIMIT_PER_SCOPE;

  if (scopes.length === 0) {
    return { transactions: [], available: true, truncated: false };
  }

  const senderScopes = scopes.filter((s) => SENDER_SCOPES.includes(s.scope));
  const receiverScopes = scopes.filter((s) => s.scope === "receiver_incoming");

  const senderWindow = senderScopes.length
    ? Math.max(...senderScopes.map((s) => s.windowMinutes))
    : 0;
  const receiverWindow = receiverScopes.length
    ? Math.max(...receiverScopes.map((s) => s.windowMinutes))
    : 0;

  const senderCap = limit * senderScopes.length + 1;
  const receiverCap = limit + 1;

  const senderQuery = senderScopes.length
    ? prisma.transaction.findMany({
        where: {
          tenantId,
          occurredAt: {
            gte: minutesBefore(transaction.occurredAt, senderWindow),
            lt: transaction.occurredAt,
          },
          OR: [
            { senderWallet: transaction.senderWalletId },
            { receiverWallet: transaction.senderWalletId },
          ],
        },
        orderBy: { occurredAt: "desc" },
        take: senderCap,
        select: ROW_SELECT,
      })
    : Promise.resolve([] as HistoryRow[]);

  const receiverQuery = receiverScopes.length
    ? prisma.transaction.findMany({
        where: {
          tenantId,
          occurredAt: {
            gte: minutesBefore(transaction.occurredAt, receiverWindow),
            lt: transaction.occurredAt,
          },
          receiverWallet: transaction.receiverWalletId,
        },
        orderBy: { occurredAt: "desc" },
        take: receiverCap,
        select: ROW_SELECT,
      })
    : Promise.resolve([] as HistoryRow[]);

  const [senderRows, receiverRows] = await Promise.all([
    senderQuery,
    receiverQuery,
  ]);

  // De-duplicate (a self-transfer can match both groups) and materialise.
  const byId = new Map<string, HistoryTransaction>();
  for (const row of senderRows) byId.set(row.id, toHistoryTransaction(row));
  for (const row of receiverRows) {
    if (!byId.has(row.id)) byId.set(row.id, toHistoryTransaction(row));
  }
  const transactions = Array.from(byId.values());

  // Truncated when a query hit its cap, or when a scope's own window holds more
  // rows than the per-scope limit.
  let truncated =
    senderRows.length > limit * senderScopes.length ||
    receiverRows.length > limit;

  if (!truncated) {
    for (const { scope, windowMinutes } of scopes) {
      const since = minutesBefore(transaction.occurredAt, windowMinutes);
      const count = transactions.reduce((n, tx) => {
        const at = tx.occurredAt.getTime();
        if (at < since.getTime() || at >= transaction.occurredAt.getTime()) {
          return n;
        }
        return isInScope(tx, transaction, scope) ? n + 1 : n;
      }, 0);
      if (count > limit) {
        truncated = true;
        break;
      }
    }
  }

  // No prior transaction for the sender or receiver in any window means history
  // is unavailable (a cap-hit always implies rows, hence available).
  const available = transactions.length > 0;

  return { transactions, available, truncated };
}
