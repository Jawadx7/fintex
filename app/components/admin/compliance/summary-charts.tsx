"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/app/components/ui/skeleton";
import type { AlertSummary } from "@/lib/compliance/dto";
import { TYPOLOGIES, isTypologyTag } from "@/lib/compliance/typologies";

const LOW_COLOR = "hsl(174 35% 55%)";
const MEDIUM_COLOR = "hsl(38 92% 50%)";
const HIGH_COLOR = "hsl(0 72% 51%)";
const TAG_COLOR = "hsl(174 27% 40%)";

function ChartFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="h-56 w-full">{children}</div>
    </div>
  );
}

export default function SummaryCharts({
  summary,
  isLoading,
}: {
  summary: AlertSummary | undefined;
  isLoading: boolean;
}) {
  if (isLoading && !summary) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const byDay = summary?.byDay ?? [];
  const byTag = summary?.byTag ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartFrame
        title="Risk mix over time"
        description="Assessments per day, split by tier"
      >
        {byDay.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No activity in this range.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDay} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="low" stackId="a" fill={LOW_COLOR} radius={[0, 0, 0, 0]} />
              <Bar dataKey="medium" stackId="a" fill={MEDIUM_COLOR} radius={[0, 0, 0, 0]} />
              <Bar dataKey="high" stackId="a" fill={HIGH_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartFrame>

      <ChartFrame
        title="Alert volume by typology"
        description="Count of tagged assessments"
      >
        {byTag.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No typologies fired in this range.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={byTag}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="tag"
                width={150}
                tickFormatter={(value: string) =>
                  isTypologyTag(value)
                    ? TYPOLOGIES[value].label
                    : value
                }
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(label: string) =>
                  isTypologyTag(label) ? TYPOLOGIES[label].label : label
                }
              />
              <Bar dataKey="count" fill={TAG_COLOR} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartFrame>
    </div>
  );
}
