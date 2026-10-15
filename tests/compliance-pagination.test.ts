import { describe, expect, it } from "vitest";

import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  getPageItems,
  MAX_PAGE_SIZE,
  normalizePageSize,
  pageRange,
  totalPagesFor,
} from "@/lib/compliance/pagination";

describe("normalizePageSize", () => {
  it("falls back to the default for missing or junk values", () => {
    expect(normalizePageSize(undefined)).toBe(DEFAULT_PAGE_SIZE);
    expect(normalizePageSize(null)).toBe(DEFAULT_PAGE_SIZE);
    expect(normalizePageSize(0)).toBe(DEFAULT_PAGE_SIZE);
    expect(normalizePageSize(-5)).toBe(DEFAULT_PAGE_SIZE);
    expect(normalizePageSize(Number.NaN)).toBe(DEFAULT_PAGE_SIZE);
  });

  it("clamps to the maximum", () => {
    expect(normalizePageSize(500)).toBe(MAX_PAGE_SIZE);
    expect(normalizePageSize(MAX_PAGE_SIZE + 1)).toBe(MAX_PAGE_SIZE);
  });

  it("keeps valid values, truncating fractions", () => {
    expect(normalizePageSize(10)).toBe(10);
    expect(normalizePageSize(7.9)).toBe(7);
  });
});

describe("totalPagesFor", () => {
  it("returns at least one page for empty results", () => {
    expect(totalPagesFor(0, 10)).toBe(1);
    expect(totalPagesFor(-3, 10)).toBe(1);
  });

  it("rounds up for partial last pages", () => {
    expect(totalPagesFor(52, 10)).toBe(6);
    expect(totalPagesFor(50, 10)).toBe(5);
    expect(totalPagesFor(1, 10)).toBe(1);
  });
});

describe("clampPage", () => {
  it("clamps out-of-range pages instead of erroring", () => {
    expect(clampPage(99, 6)).toBe(6);
    expect(clampPage(0, 6)).toBe(1);
    expect(clampPage(-1, 6)).toBe(1);
    expect(clampPage(undefined, 6)).toBe(1);
    expect(clampPage(3, 6)).toBe(3);
  });

  it("never returns below 1 even with zero pages", () => {
    expect(clampPage(5, 0)).toBe(1);
  });
});

describe("pageRange", () => {
  it("reports a full page window", () => {
    expect(pageRange(1, 10, 52)).toEqual({ start: 1, end: 10 });
    expect(pageRange(3, 10, 52)).toEqual({ start: 21, end: 30 });
  });

  it("reports the remainder on the last page", () => {
    expect(pageRange(6, 10, 52)).toEqual({ start: 51, end: 52 });
  });

  it("handles an empty result", () => {
    expect(pageRange(1, 10, 0)).toEqual({ start: 0, end: 0 });
  });
});

describe("getPageItems", () => {
  it("lists every page when there are few", () => {
    expect(getPageItems(1, 1)).toEqual([1]);
    expect(getPageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("collapses the middle around the current page", () => {
    expect(getPageItems(5, 20)).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      20,
    ]);
  });

  it("keeps the first/last page groups at the edges", () => {
    expect(getPageItems(1, 20)).toEqual([1, 2, "ellipsis", 20]);
    expect(getPageItems(2, 20)).toEqual([1, 2, 3, "ellipsis", 20]);
    expect(getPageItems(20, 20)).toEqual([1, "ellipsis", 19, 20]);
  });

  it("returns nothing for an empty result", () => {
    expect(getPageItems(1, 0)).toEqual([]);
  });
});
