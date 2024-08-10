"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  {
    // name: "1",
    income: 4000,
    outcome: 2400,
  },
  {
    // name: "2",
    income: 2000,
    outcome: 1200,
  },
  {
    // name: "3",
    income: 1890,
    outcome: 4800,
  },
  {
    // name: "4",
    income: 3490,
    outcome: 4300,
  },
];

const Chart = () => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        width={500}
        height={400}
        data={data}
        margin={{
          top: 0,
          right: 10,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="1 1" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="income"
          stackId="1"
          stroke="#8884d8"
          fill="transparent"
        />
        <Area
          type="monotone"
          dataKey="outcome"
          stackId="2"
          stroke="#82ca9d"
          fill="transparent"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
export default Chart;
