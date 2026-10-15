"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/app/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import type {
  AlertReviewStatus,
  AlertTier,
  RangeKey,
} from "@/lib/compliance/dto";
import { getPageItems, pageRange } from "@/lib/compliance/pagination";
import { TYPOLOGIES, TYPOLOGY_TAGS } from "@/lib/compliance/typologies";

import AlertsTable from "./alerts-table";
import {
  fetchAlerts,
  fetchSummary,
  PAGE_SIZE,
  queryKeys,
  type AlertFilters,
} from "./api";
import SummaryCards from "./summary-cards";
import SummaryCharts from "./summary-charts";

const ALL = "all";

function parsePage(raw: string | null): number {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 1 ? Math.trunc(value) : 1;
}

function useUrlFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: AlertFilters = {
    tier: (searchParams.get("tier") as AlertTier | null) ?? "",
    status: (searchParams.get("status") as AlertReviewStatus | null) ?? "",
    tag: searchParams.get("tag") ?? "",
    q: searchParams.get("q") ?? "",
    range: (searchParams.get("range") as RangeKey | null) ?? "all",
    includeCleared: searchParams.get("includeCleared") === "true",
  };

  const page = parsePage(searchParams.get("page"));

  /**
   * Patch the URL. Any change other than an explicit `page` resets back to
   * page 1 so filters and search always apply from the first page.
   */
  function update(
    patch: Partial<Record<keyof AlertFilters | "page", string | boolean>>
  ) {
    const params = new URLSearchParams(searchParams.toString());
    if (patch.page === undefined) params.delete("page");
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === "" || value === false) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function hrefFor(targetPage: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  return { filters, page, update, hrefFor };
}

export default function AlertsDashboard() {
  const searchParams = useSearchParams();
  const { filters, page: requestedPage, update, hrefFor } = useUrlFilters();

  const [qInput, setQInput] = useState(filters.q);

  const summaryQuery = useQuery({
    queryKey: queryKeys.summary(filters.range),
    queryFn: () => fetchSummary(filters.range),
  });

  const alertsQuery = useQuery({
    queryKey: queryKeys.alerts(filters, requestedPage),
    queryFn: () => fetchAlerts(filters, requestedPage),
    placeholderData: keepPreviousData,
  });

  const items = alertsQuery.data?.items ?? [];
  const total = alertsQuery.data?.total ?? 0;
  const page = alertsQuery.data?.page ?? requestedPage;
  const totalPages = alertsQuery.data?.totalPages ?? 1;
  const range = pageRange(page, PAGE_SIZE, total);
  const pageItems = getPageItems(page, totalPages);
  const fromSearch = searchParams.toString();

  function goToPage(target: number) {
    if (target === page) return;
    update({ page: String(target) });
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Compliance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Risk alerts scored across wallet transactions. This environment uses
          synthetic demo data only.
        </p>
      </header>

      <SummaryCards
        summary={summaryQuery.data}
        isLoading={summaryQuery.isLoading}
      />

      <SummaryCharts
        summary={summaryQuery.data}
        isLoading={summaryQuery.isLoading}
      />

      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="range">Range</Label>
            <Select
              value={filters.range}
              onValueChange={(v) => update({ range: v })}
            >
              <SelectTrigger id="range" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tier">Tier</Label>
            <Select
              value={filters.tier || ALL}
              onValueChange={(v) => update({ tier: v === ALL ? "" : v })}
            >
              <SelectTrigger id="tier" className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All tiers</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="status">Status</Label>
            <Select
              value={filters.status || ALL}
              onValueChange={(v) => update({ status: v === ALL ? "" : v })}
            >
              <SelectTrigger id="status" className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="ESCALATED">Escalated</SelectItem>
                <SelectItem value="DISMISSED">Dismissed</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tag">Typology</Label>
            <Select
              value={filters.tag || ALL}
              onValueChange={(v) => update({ tag: v === ALL ? "" : v })}
            >
              <SelectTrigger id="tag" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All typologies</SelectItem>
                {TYPOLOGY_TAGS.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {TYPOLOGIES[tag].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <form
            className="grid gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              update({ q: qInput });
            }}
          >
            <Label htmlFor="q">Search</Label>
            <div className="flex gap-2">
              <Input
                id="q"
                value={qInput}
                onChange={(event) => setQInput(event.target.value)}
                placeholder="Wallet or reference"
                className="w-[200px]"
              />
              <Button type="submit" variant="outline">
                Search
              </Button>
            </div>
          </form>

          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="cleared"
              checked={filters.includeCleared}
              onCheckedChange={(checked) =>
                update({ includeCleared: checked === true })
              }
            />
            <Label htmlFor="cleared" className="cursor-pointer">
              Include cleared
            </Label>
          </div>
        </div>
      </div>

      <AlertsTable
        items={items}
        isLoading={alertsQuery.isLoading || alertsQuery.isFetching}
        error={(alertsQuery.error as Error | null) ?? null}
        fromSearch={fromSearch}
        onRetry={() => alertsQuery.refetch()}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {total === 0
            ? "No alerts to show"
            : `Showing ${range.start}\u2013${range.end} of ${total}`}
        </p>

        {totalPages > 1 ? (
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={hrefFor(Math.max(1, page - 1))}
                  aria-disabled={page <= 1}
                  className={
                    page <= 1 ? "pointer-events-none opacity-50" : undefined
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    goToPage(page - 1);
                  }}
                />
              </PaginationItem>

              {pageItems.map((item, index) =>
                item === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationLink
                      href={hrefFor(item)}
                      isActive={item === page}
                      aria-label={`Go to page ${item}`}
                      onClick={(event) => {
                        event.preventDefault();
                        goToPage(item);
                      }}
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  href={hrefFor(Math.min(totalPages, page + 1))}
                  aria-disabled={page >= totalPages}
                  className={
                    page >= totalPages
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    goToPage(page + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}
      </div>
    </div>
  );
}
