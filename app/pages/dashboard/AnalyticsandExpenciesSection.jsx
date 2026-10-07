"use client";

import { useState } from "react";
import { Cell, Pie, PieChart } from "recharts";

import Chart from "../../components/Chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/app/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

const expenseData = [
  { label: "Grocery", value: 20, fill: "var(--color-grocery)" },
  { label: "Medical Care", value: 15, fill: "var(--color-medical)" },
  { label: "Shopping", value: 10, fill: "var(--color-shopping)" },
  { label: "Entertainment", value: 17, fill: "var(--color-entertainment)" },
];

const expenseConfig = {
  value: { label: "Spend" },
  grocery: { label: "Grocery", color: "hsl(var(--chart-1))" },
  medical: { label: "Medical Care", color: "hsl(var(--chart-2))" },
  shopping: { label: "Shopping", color: "hsl(var(--chart-3))" },
  entertainment: { label: "Entertainment", color: "hsl(var(--chart-4))" },
};

const AnalyticsandExpenciesSection = () => {
  const [time, setTime] = useState("Month");

  return (
    <div className="my-5 flex flex-col space-y-5 md:flex-row md:space-y-0 md:space-x-4">
      <div className="flex-[1] rounded-md shadow-md">
        <Chart />
      </div>

      <div className="flex-[1] rounded-md p-3 shadow-md">
        <div className="flex align-center justify-between">
          <span>All Expencies</span>

          <Select value={time} onValueChange={setTime}>
            <SelectTrigger id="time-filter" className="w-[120px]">
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Day">Day</SelectItem>
              <SelectItem value="Month">Month</SelectItem>
              <SelectItem value="Year">Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ChartContainer
          config={expenseConfig}
          className="mx-auto aspect-square max-h-[150px]"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
            <Pie
              data={expenseData}
              dataKey="value"
              nameKey="label"
              innerRadius={30}
              strokeWidth={5}
            >
              {expenseData.map((entry) => (
                <Cell key={entry.label} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>
    </div>
  );
};
export default AnalyticsandExpenciesSection;