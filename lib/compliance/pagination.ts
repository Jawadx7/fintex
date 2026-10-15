// Pure, client-safe pagination helpers shared by the API layer and the UI.
// Kept free of Prisma/server-only imports so they can be unit-tested directly.

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

/** Coerce an arbitrary page-size input into 1..MAX_PAGE_SIZE (default on junk). */
export function normalizePageSize(value: number | undefined | null): number {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return DEFAULT_PAGE_SIZE;
  }
  const int = Math.trunc(value);
  if (int < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(int, MAX_PAGE_SIZE);
}

/** Number of pages for a total, always at least 1 (empty result = page 1). */
export function totalPagesFor(total: number, pageSize: number): number {
  if (total <= 0) return 1;
  const size = normalizePageSize(pageSize);
  return Math.max(1, Math.ceil(total / size));
}

/** Clamp a requested page into 1..totalPages so out-of-range never errors. */
export function clampPage(
  page: number | undefined | null,
  totalPages: number
): number {
  const max = Math.max(1, totalPages);
  const requested =
    page === undefined || page === null || !Number.isFinite(page)
      ? 1
      : Math.trunc(page);
  return Math.min(Math.max(1, requested), max);
}

/** Inclusive 1-indexed window for a page, e.g. { start: 51, end: 52 }. */
export function pageRange(
  page: number,
  pageSize: number,
  total: number
): { start: number; end: number } {
  if (total <= 0) return { start: 0, end: 0 };
  const size = normalizePageSize(pageSize);
  const start = (page - 1) * size + 1;
  const end = Math.min(page * size, total);
  return { start, end };
}

export type PageItem = number | "ellipsis";

/**
 * Page numbers to render, collapsing the middle with ellipses.
 * e.g. getPageItems(5, 20) -> [1, "ellipsis", 4, 5, 6, "ellipsis", 20].
 */
export function getPageItems(current: number, total: number): PageItem[] {
  if (total <= 0) return [];
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const clamped = clampPage(current, total);
  const items: PageItem[] = [1];
  const left = Math.max(2, clamped - 1);
  const right = Math.min(total - 1, clamped + 1);

  if (left > 2) items.push("ellipsis");
  for (let p = left; p <= right; p += 1) items.push(p);
  if (right < total - 1) items.push("ellipsis");
  items.push(total);

  return items;
}
