import { ChartBar, Home, Receipt, ArrowRightCircle } from "lucide-react";
import { PieChart, ChartLine, Brain } from "lucide-react";

export const account_tabs = [
  {
    id: "dashboard",
    name: "Dashboard",
    icon: <Home />,
  },
  {
    id: "transactions",
    name: "Transactions",
    icon: <Receipt />,
  },
  {
    id: "payment_transfers",
    name: "Payment & Transfers",
    icon: <ArrowRightCircle />,
  },
];

export const tools_tabs = [
  {
    id: "budgets",
    name: "Budgets",
    icon: <PieChart />,
  },
  {
    id: "investments",
    name: "Investments",
    icon: <ChartLine />,
  },
  {
    id: "data_visualization",
    name: "Data Visualization",
    icon: <ChartBar />,
  },
  {
    id: "financial_advisor",
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
