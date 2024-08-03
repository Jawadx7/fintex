import { ChartBar, Home, Receipt, ArrowRightCircle } from "lucide-react";
import { PieChart, ChartLine, Brain } from "lucide-react";

export const account_tabs = [
  {
    name: "Dashboard",
    icon: <Home />,
  },
  {
    name: "Transactions",
    icon: <Receipt />,
  },
  {
    name: "Payment & Transfers",
    icon: <ArrowRightCircle />,
  },
];

export const tools_tabs = [
  {
    name: "Budgets",
    icon: <PieChart />,
  },
  {
    name: "Investments",
    icon: <ChartLine />,
  },
  {
    name: "Data Visualization",
    icon: <ChartBar />,
  },
  {
    name: "Financial Advisor",
    icon: <Brain />,
  },
];

export const link_tabs = [
  {
    name: "Terms & Services",
    path: "/Terms&Conditions",
    icon: <ChartBar />,
  },
  {
    name: "Settings",
    path: "",
    icon: <ChartBar />,
  },
  {
    name: "Support",
    path: "",
    icon: <ChartBar />,
  },
];
