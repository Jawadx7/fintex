"use client";

import type {
  AlertDetail,
  AlertReviewStatus,
  AlertSummary,
  AlertTier,
  AlertsPage,
  RangeKey,
} from "@/lib/compliance/dto";

export interface AlertFilters {
  tier: AlertTier | "";
  status: AlertReviewStatus | "";
  tag: string;
  q: string;
  range: RangeKey;
  includeCleared: boolean;
}

export const EMPTY_FILTERS: AlertFilters = {
  tier: "",
  status: "",
  tag: "",
  q: "",
  range: "all",
  includeCleared: false,
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const queryKeys = {
  summary: (range: RangeKey) => ["compliance", "summary", range] as const,
  alerts: (filters: AlertFilters, page: number) =>
    ["compliance", "alerts", filters, page] as const,
  alert: (id: string) => ["compliance", "alert", id] as const,
};

export const PAGE_SIZE = 10;

export function alertsQueryString(
  filters: AlertFilters,
  page: number,
  pageSize = PAGE_SIZE
): string {
  const params = new URLSearchParams();
  if (filters.tier) params.set("tier", filters.tier);
  if (filters.status) params.set("status", filters.status);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.q) params.set("q", filters.q);
  if (filters.range && filters.range !== "all") params.set("range", filters.range);
  if (filters.includeCleared) params.set("includeCleared", "true");
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return params.toString();
}

export function fetchAlerts(
  filters: AlertFilters,
  page: number
): Promise<AlertsPage> {
  return getJson(`/api/admin/alerts?${alertsQueryString(filters, page)}`);
}

export function fetchSummary(range: RangeKey): Promise<AlertSummary> {
  const qs = range && range !== "all" ? `?range=${range}` : "";
  return getJson(`/api/admin/alerts/summary${qs}`);
}

export function fetchAlertDetail(id: string): Promise<AlertDetail> {
  return getJson(`/api/admin/alerts/${id}`);
}

export async function patchAlertReview(
  id: string,
  body: { status: AlertReviewStatus; note?: string }
): Promise<AlertDetail> {
  const res = await fetch(`/api/admin/alerts/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Request failed (${res.status})`);
  }
  return (await res.json()) as AlertDetail;
}
