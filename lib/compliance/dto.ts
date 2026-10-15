// Serialized shapes returned by the compliance API. Decimal money is always a
// string on the wire; timestamps are ISO strings. Client-safe (no Prisma).

export type AlertTier = "LOW" | "MEDIUM" | "HIGH";
export type AlertAction = "ALLOW" | "ALLOW_AND_REVIEW" | "HOLD_AND_ALERT";
export type AlertReviewStatus =
  | "OPEN"
  | "ESCALATED"
  | "DISMISSED"
  | "CONFIRMED";
export type AlertTransactionType = "TRANSFER" | "CASH_OUT";

export interface AlertListItem {
  id: string;
  transactionId: string;
  occurredAt: string;
  createdAt: string;
  amount: string;
  currency: string;
  type: AlertTransactionType;
  senderWallet: string;
  receiverWallet: string;
  senderBalanceBefore: string | null;
  riskScore: number;
  tier: AlertTier;
  action: AlertAction;
  tags: string[];
  reviewStatus: AlertReviewStatus | null;
  reviewedAt: string | null;
}

export interface ReviewerRef {
  id: string;
  name: string;
  email: string;
}

export interface AlertDetail extends AlertListItem {
  reasons: string[];
  evidence: unknown | null;
  modelVersion: string;
  latencyMs: number | null;
  reviewNote: string | null;
  reviewedBy: ReviewerRef | null;
  /** Transactions referenced by the assessment evidence. */
  relatedTransactions: AlertListItem[];
  /** Other transactions on the same sender wallet within ±24h. */
  senderHistory: AlertListItem[];
}

export interface AlertsPage {
  items: AlertListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type { AlertSummary, RangeKey } from "./summary";
