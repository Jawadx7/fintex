"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Separator } from "@/app/components/ui/separator";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Textarea } from "@/app/components/ui/textarea";
import type { AlertDetail, AlertReviewStatus } from "@/lib/compliance/dto";
import { formatDateTime, formatMoney, formatRiskScore, shortWallet } from "@/lib/compliance/format";
import { TYPOLOGIES, isTypologyTag } from "@/lib/compliance/typologies";

import { ReviewStatusBadge, TierBadge, TypologyTagBadge } from "./badges";
import { fetchAlertDetail, patchAlertReview, queryKeys } from "./api";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}

function Timeline({
  detail,
}: {
  detail: AlertDetail;
}) {
  const relatedIds = new Set(
    detail.relatedTransactions.map((tx) => tx.transactionId)
  );

  return (
    <ol className="grid gap-2">
      {detail.senderHistory.map((entry) => {
        const isCurrent = entry.transactionId === detail.transactionId;
        const isRelated = relatedIds.has(entry.transactionId);
        return (
          <li
            key={entry.transactionId}
            className={
              "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm " +
              (isCurrent
                ? "border-primary bg-primary/5"
                : isRelated
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-border")
            }
          >
            <div className="min-w-0">
              <p className="truncate text-muted-foreground">
                {formatDateTime(entry.occurredAt)}
              </p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                → {shortWallet(entry.receiverWallet)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isCurrent && (
                <span className="text-xs font-medium text-primary">This txn</span>
              )}
              {!isCurrent && isRelated && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Related
                </span>
              )}
              <span className="tabular-nums text-foreground">
                {formatMoney(entry.amount, entry.currency)}
              </span>
              <TierBadge tier={entry.tier} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ReviewPanel({ detail }: { detail: AlertDetail }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AlertReviewStatus | "">(
    detail.reviewStatus ?? ""
  );
  const [note, setNote] = useState(detail.reviewNote ?? "");

  const noReview = detail.reviewStatus === null;

  const mutation = useMutation({
    mutationFn: (body: { status: AlertReviewStatus; note?: string }) =>
      patchAlertReview(detail.id, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.alert(detail.id) });
      const previous = queryClient.getQueryData<AlertDetail>(
        queryKeys.alert(detail.id)
      );
      if (previous) {
        queryClient.setQueryData<AlertDetail>(queryKeys.alert(detail.id), {
          ...previous,
          reviewStatus: body.status,
          reviewNote: body.note ?? null,
          reviewedAt: new Date().toISOString(),
        });
      }
      return { previous };
    },
    onError: (error, _body, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.alert(detail.id), context.previous);
      }
      toast.error("Could not save review", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.alert(detail.id), data);
      queryClient.invalidateQueries({ queryKey: ["compliance", "alerts"] });
      queryClient.invalidateQueries({ queryKey: ["compliance", "summary"] });
      toast.success("Review saved");
    },
  });

  if (noReview) {
    return (
      <p className="text-sm text-muted-foreground">
        This transaction scored LOW and does not require analyst review.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="review-status">Decision</Label>
        <Select
          value={status || undefined}
          onValueChange={(value) => setStatus(value as AlertReviewStatus)}
        >
          <SelectTrigger id="review-status">
            <SelectValue placeholder="Select a decision" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="ESCALATED">Escalate</SelectItem>
            <SelectItem value="CONFIRMED">Confirm</SelectItem>
            <SelectItem value="DISMISSED">Dismiss</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="review-note">Note (optional)</Label>
        <Textarea
          id="review-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add context for this decision…"
        />
      </div>

      <Button
        disabled={!status || mutation.isPending}
        onClick={() => {
          if (!status) return;
          mutation.mutate({ status, note: note.trim() || undefined });
        }}
      >
        {mutation.isPending ? "Saving…" : "Save review"}
      </Button>

      {detail.reviewedBy && (
        <p className="text-xs text-muted-foreground">
          Last reviewed by {detail.reviewedBy.name} on{" "}
          {detail.reviewedAt ? formatDateTime(detail.reviewedAt) : "—"}.
        </p>
      )}
    </div>
  );
}

export default function AlertDetailView({
  id,
  backQuery = "",
}: {
  id: string;
  backQuery?: string;
}) {
  const query = useQuery({
    queryKey: queryKeys.alert(id),
    queryFn: () => fetchAlertDetail(id),
  });

  const backHref = backQuery
    ? `/admin/compliance?${backQuery}`
    : "/admin/compliance";

  if (query.isLoading) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="grid gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to alerts
        </Link>
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm font-medium text-foreground">
            Alert not found.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {query.error instanceof Error ? query.error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  const detail = query.data;

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to alerts
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">
            {formatMoney(detail.amount, detail.currency)}
          </h1>
          <TierBadge tier={detail.tier} />
          <ReviewStatusBadge status={detail.reviewStatus} />
          <span className="text-sm text-muted-foreground">
            {formatRiskScore(detail.riskScore)} risk · {detail.type}
          </span>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Occurred" value={formatDateTime(detail.occurredAt)} />
          <Field
            label="Sender"
            value={
              <span className="font-mono text-xs">
                {detail.senderWallet}
              </span>
            }
          />
          <Field
            label="Receiver"
            value={
              <span className="font-mono text-xs">
                {detail.receiverWallet}
              </span>
            }
          />
          <Field
            label="Balance before"
            value={
              detail.senderBalanceBefore
                ? formatMoney(detail.senderBalanceBefore, detail.currency)
                : "—"
            }
          />
          <Field label="Action" value={detail.action} />
          <Field label="Model" value={detail.modelVersion} />
          <Field
            label="Latency"
            value={detail.latencyMs != null ? `${detail.latencyMs} ms` : "—"}
          />
          <Field label="Transaction id" value={<span className="font-mono text-xs">{detail.transactionId}</span>} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Why this was flagged</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ul className="grid gap-1.5">
                {detail.reasons.map((reason, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>

              {detail.tags.length > 0 && (
                <>
                  <Separator />
                  <div className="grid gap-3">
                    {detail.tags.map((tag) => {
                      const typology = isTypologyTag(tag) ? TYPOLOGIES[tag] : null;
                      return (
                        <div key={tag} className="rounded-md border p-3">
                          <div className="flex items-center gap-2">
                            <TypologyTagBadge tag={tag} />
                            <span className="text-xs text-muted-foreground">
                              {typology?.summary}
                            </span>
                          </div>
                          {typology && (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {typology.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    Evidence (JSON)
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">
                    {JSON.stringify(detail.evidence ?? {}, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sender timeline (±24h)</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.senderHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No other transactions on this wallet nearby.
                </p>
              ) : (
                <Timeline detail={detail} />
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Review</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewPanel detail={detail} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
