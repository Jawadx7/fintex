import { describe, expect, it } from "vitest";

import {
  formatDateTime,
  formatMoney,
  formatRiskScore,
  shortWallet,
} from "@/lib/compliance/format";

describe("compliance formatting helpers", () => {
  it("formats decimal money strings with 2 places and a currency", () => {
    const formatted = formatMoney("2500.00", "GHS");
    expect(formatted).toContain("2,500.00");
    expect(formatted).toContain("GH");
  });

  it("accepts numbers as well as strings", () => {
    expect(formatMoney(1234.5)).toContain("1,234.50");
  });

  it("returns a placeholder for invalid money", () => {
    expect(formatMoney("not-a-number")).toBe("—");
  });

  it("renders a 0-1 risk score as a percentage", () => {
    expect(formatRiskScore(0.82)).toBe("82%");
    expect(formatRiskScore(1)).toBe("100%");
  });

  it("shortens long wallet ids", () => {
    const short = shortWallet("wlt_ABCDEFGH1234");
    expect(short).toContain("…");
    expect(short.length).toBeLessThan("wlt_ABCDEFGH1234".length);
  });

  it("formats valid dates and falls back on invalid input", () => {
    expect(formatDateTime("2026-10-15T10:00:00.000Z")).not.toBe("—");
    expect(formatDateTime("nonsense")).toBe("—");
  });
});
