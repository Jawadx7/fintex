"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import type { AlertListItem } from "@/lib/compliance/dto";
import { formatDateTime, formatMoney, formatRiskScore, shortWallet } from "@/lib/compliance/format";

import { ReviewStatusBadge, TierBadge, TypologyTagBadge } from "./badges";

export default function AlertsTable({
  items,
  isLoading,
  error,
  fromSearch,
  onRetry,
}: {
  items: AlertListItem[];
  isLoading: boolean;
  error: Error | null;
  fromSearch: string;
  onRetry: () => void;
}) {
  const router = useRouter();

  function detailHref(id: string): string {
    const base = `/admin/compliance/${id}`;
    return fromSearch ? `${base}?from=${encodeURIComponent(fromSearch)}` : base;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <p className="text-sm font-medium text-foreground">
          Could not load alerts.
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {error.message}
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead className="hidden md:table-cell">Wallets</TableHead>
            <TableHead>Risk</TableHead>
            <TableHead className="hidden lg:table-cell">Tags</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && items.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))
            : items.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() => router.push(detailHref(item.id))}
                  className="cursor-pointer"
                >
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(item.occurredAt)}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {formatMoney(item.amount, item.currency)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="font-mono text-xs text-muted-foreground">
                      {shortWallet(item.senderWallet)}
                    </span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {shortWallet(item.receiverWallet)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TierBadge tier={item.tier} />
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatRiskScore(item.riskScore)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        item.tags.map((tag) => (
                          <TypologyTagBadge key={tag} tag={tag} />
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ReviewStatusBadge status={item.reviewStatus} />
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>

      {!isLoading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
          <p className="text-sm font-medium text-foreground">No alerts found</p>
          <p className="text-xs text-muted-foreground">
            Try widening the filters or enabling cleared transactions.
          </p>
        </div>
      )}
    </div>
  );
}
