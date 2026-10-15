import { describe, expect, it } from "vitest";

import { rangeToSince, summarize, type SummaryEntry } from "@/lib/compliance/summary";

function entry(overrides: Partial<SummaryEntry>): SummaryEntry {
  return {
    tier: "LOW",
    tags: [],
    reviewStatus: null,
    // Local-time construction keeps the day bucket stable in any timezone.
    occurredAt: new Date(2026, 9, 15, 10, 0, 0),
    ...overrides,
  };
}

describe("summarize", () => {
  it("computes totals, day buckets and tag counts from a fixture", () => {
    const entries: SummaryEntry[] = [
      entry({ tier: "LOW" }),
      entry({ tier: "LOW" }),
      entry({
        tier: "HIGH",
        tags: ["FULL_BALANCE_DRAIN"],
        reviewStatus: "OPEN",
      }),
      entry({
        tier: "HIGH",
        tags: ["THRESHOLD_SKIRTING", "RAPID_SEQUENCE"],
        reviewStatus: "OPEN",
      }),
      entry({
        tier: "MEDIUM",
        tags: ["RAPID_SEQUENCE"],
        reviewStatus: "CONFIRMED",
        occurredAt: new Date(2026, 9, 14, 9, 0, 0),
      }),
    ];

    const result = summarize(entries, 9);

    expect(result.totals).toEqual({
      transactions: 9,
      flagged: 3,
      open: 2,
      high: 2,
    });

    expect(result.byDay).toEqual([
      { date: "2026-10-14", low: 0, medium: 1, high: 0 },
      { date: "2026-10-15", low: 2, medium: 0, high: 2 },
    ]);

    expect(result.byTag[0]).toEqual({ tag: "RAPID_SEQUENCE", count: 2 });
    expect(result.byTag).toHaveLength(3);
  });

  it("defaults transaction total to the entry count", () => {
    const result = summarize([entry({})]);
    expect(result.totals.transactions).toBe(1);
  });

  it("handles an empty fixture", () => {
    const result = summarize([], 0);
    expect(result.totals).toEqual({
      transactions: 0,
      flagged: 0,
      open: 0,
      high: 0,
    });
    expect(result.byDay).toEqual([]);
    expect(result.byTag).toEqual([]);
  });
});

describe("rangeToSince", () => {
  const now = new Date(2026, 9, 15, 12, 0, 0);

  it("returns null for the all-time range", () => {
    expect(rangeToSince("all", now)).toBeNull();
  });

  it("returns a window boundary for 24h and 7d", () => {
    expect(rangeToSince("24h", now)?.getTime()).toBe(
      now.getTime() - 24 * 60 * 60 * 1000
    );
    expect(rangeToSince("7d", now)?.getTime()).toBe(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    );
  });
});
