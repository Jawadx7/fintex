// Pure aggregation for the compliance summary endpoint. Kept free of Prisma so
// it can be unit-tested against fixtures.

import type { AlertTier } from "./dto";

export type RangeKey = "24h" | "7d" | "all";

export const RANGE_KEYS: RangeKey[] = ["24h", "7d", "all"];

const HOUR_MS = 60 * 60 * 1000;

/** Start of the reporting window, or null for "all". */
export function rangeToSince(range: RangeKey, now = new Date()): Date | null {
  if (range === "24h") return new Date(now.getTime() - 24 * HOUR_MS);
  if (range === "7d") return new Date(now.getTime() - 7 * 24 * HOUR_MS);
  return null;
}

export interface SummaryEntry {
  tier: AlertTier;
  tags: string[];
  reviewStatus: string | null;
  occurredAt: Date;
}

export interface SummaryDay {
  date: string;
  low: number;
  medium: number;
  high: number;
}

export interface SummaryTag {
  tag: string;
  count: number;
}

export interface SummaryTotals {
  transactions: number;
  flagged: number;
  open: number;
  high: number;
}

export interface AlertSummary {
  totals: SummaryTotals;
  byDay: SummaryDay[];
  byTag: SummaryTag[];
}

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Aggregate assessment-level facts. `totalTransactions` (when provided) counts
 * every transaction in range, including any without an assessment.
 */
export function summarize(
  entries: SummaryEntry[],
  totalTransactions?: number
): AlertSummary {
  const totals: SummaryTotals = {
    transactions: totalTransactions ?? entries.length,
    flagged: 0,
    open: 0,
    high: 0,
  };

  const days = new Map<string, SummaryDay>();
  const tags = new Map<string, number>();

  for (const entry of entries) {
    const flagged = entry.tier !== "LOW";
    if (flagged) totals.flagged += 1;
    if (entry.reviewStatus === "OPEN") totals.open += 1;
    if (entry.tier === "HIGH") totals.high += 1;

    const key = dayKey(entry.occurredAt);
    const day =
      days.get(key) ?? { date: key, low: 0, medium: 0, high: 0 };
    if (entry.tier === "LOW") day.low += 1;
    else if (entry.tier === "MEDIUM") day.medium += 1;
    else day.high += 1;
    days.set(key, day);

    for (const tag of entry.tags) {
      tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }
  }

  const byDay = Array.from(days.values()).sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );

  const byTag = Array.from(tags.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  return { totals, byDay, byTag };
}
