import { Card, CardContent } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import type { AlertSummary } from "@/lib/compliance/dto";

interface Stat {
  label: string;
  value?: number;
  hint: string;
}

function StatCard({ stat }: { stat: Stat }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {stat.label}
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
          {stat.value === undefined ? (
            <Skeleton className="h-7 w-14" />
          ) : (
            stat.value.toLocaleString()
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
      </CardContent>
    </Card>
  );
}

export default function SummaryCards({
  summary,
  isLoading,
}: {
  summary: AlertSummary | undefined;
  isLoading: boolean;
}) {
  const stats: Stat[] = [
    {
      label: "Transactions",
      value: summary?.totals.transactions,
      hint: "In selected range",
    },
    {
      label: "Flagged",
      value: summary?.totals.flagged,
      hint: "Medium or high risk",
    },
    {
      label: "Open reviews",
      value: summary?.totals.open,
      hint: "Awaiting a decision",
    },
    {
      label: "High risk",
      value: summary?.totals.high,
      hint: "Immediate attention",
    },
  ];

  if (isLoading && !summary) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-7 w-14" />
              <Skeleton className="mt-2 h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
    </div>
  );
}
