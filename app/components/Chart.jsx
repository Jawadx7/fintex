"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/app/components/ui/chart";

const data = [
  // `name` drives the X axis via dataKey="name" below; it was previously
  // commented out, which left the axis blank.
  { name: "Week 1", income: 4000, outcome: 2400 },
  { name: "Week 2", income: 2000, outcome: 1200 },
  { name: "Week 3", income: 1890, outcome: 4800 },
  { name: "Week 4", income: 3490, outcome: 4300 },
];

const chartConfig = {
  income: { label: "Income", color: "hsl(var(--chart-1))" },
  outcome: { label: "Outcome", color: "hsl(var(--chart-2))" },
};

const Chart = () => {
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[250px] w-full"
    >
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fill-income" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="fill-outcome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-outcome)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-outcome)" stopOpacity={0.05} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="1 1" vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(value) => `$${value}`}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />

        <Area
          dataKey="income"
          type="monotone"
          stackId="1"
          stroke="var(--color-income)"
          fill="url(#fill-income)"
        />
        <Area
          dataKey="outcome"
          type="monotone"
          stackId="2"
          stroke="var(--color-outcome)"
          fill="url(#fill-outcome)"
        />
      </AreaChart>
    </ChartContainer>
  );
};
export default Chart;