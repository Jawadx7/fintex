import "server-only";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

/** Display shape the transaction table renders. */
export type TransactionRow = {
  id: string;
  reference: string;
  name: string;
  type: "send" | "receive" | "withdrawal" | "deposit";
  amount: number;
  date: string;
  status: "success" | "pending" | "failed";
  charges: number;
};

export type AccountSummary = {
  id: string;
  name: string;
  type: string;
  balance: number;
};

export type FinanceSummary = {
  totalBalance: number;
  income: number;
  outcome: number;
  accountCount: number;
};

// Prisma returns Decimal instances; client components need plain numbers.
function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  ) {
    return (value as { toNumber(): number }).toNumber();
  }
  return Number(value);
}

const TYPE_LABEL: Record<string, TransactionRow["type"]> = {
  SEND: "send",
  RECEIVE: "receive",
  WITHDRAWAL: "withdrawal",
  DEPOSIT: "deposit",
};

const STATUS_LABEL: Record<string, TransactionRow["status"]> = {
  SUCCESS: "success",
  PENDING: "pending",
  FAILED: "failed",
};

export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const days = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000
  );

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// The narrow structural type we need, so this stays independent of which
// Prisma select/include shape the caller used.
type RawTransaction = {
  id: string;
  reference: string;
  name: string;
  type: string;
  status: string;
  amount: unknown;
  charges: unknown;
  occurredAt: Date;
};

export function toTransactionRow(tx: RawTransaction): TransactionRow {
  return {
    id: tx.id,
    reference: tx.reference,
    name: tx.name,
    type: TYPE_LABEL[tx.type] ?? "send",
    amount: toNumber(tx.amount),
    date: formatRelativeDate(tx.occurredAt),
    status: STATUS_LABEL[tx.status] ?? "pending",
    charges: toNumber(tx.charges),
  };
}

function summarise(transactions: TransactionRow[]): FinanceSummary {
  let income = 0;
  let outcome = 0;

  for (const tx of transactions) {
    if (tx.status !== "success") continue;
    if (tx.type === "receive" || tx.type === "deposit") {
      income += tx.amount;
    } else {
      outcome += tx.amount + tx.charges;
    }
  }

  return { totalBalance: 0, income, outcome, accountCount: 0 };
}

export async function getFinanceData(): Promise<{
  accounts: AccountSummary[];
  transactions: TransactionRow[];
  summary: FinanceSummary;
}> {
  const user = await requireUser();

  const [accounts, rawTransactions] = await Promise.all([
    prisma.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { occurredAt: "desc" },
    }),
  ]);

  const transactions = rawTransactions.map(toTransactionRow);

  const accountSummaries: AccountSummary[] = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    balance: toNumber(account.balance),
  }));

  const summary: FinanceSummary = {
    ...summarise(transactions),
    totalBalance: accountSummaries.reduce(
      (total, account) => total + account.balance,
      0
    ),
    accountCount: accountSummaries.length,
  };

  return { accounts: accountSummaries, transactions, summary };
}
