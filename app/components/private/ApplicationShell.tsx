"use client";

import { useState } from "react";
import DashboardNavbar from "./DashboardNavbar";
import Sidebar from "./Sidebar";

import UserDashboard from "../../pages/dashboard/UserDashboard";
import Transactions from "../../pages/transactions/Transactions";
import PaymentsAndTransfers from "../../pages/paymentsNtransfers/Payments_Transfers";
import Budgets from "../../pages/Budgets/Budgets";
import Investments from "../../pages/Investments/Investments";
import DataVisualization from "../../pages/Data_Visualization/DataVisualization";
import Advisor from "../../pages/Advisor/Advisor";

import type { AccountSummary, FinanceSummary, TransactionRow } from "@/lib/finance";

type ApplicationShellProps = {
  appPage: string;
  accounts: AccountSummary[];
  transactions: TransactionRow[];
  summary: FinanceSummary;
  userName?: string | null;
};

const ApplicationShell = ({
  appPage,
  accounts,
  transactions,
  summary,
  userName,
}: ApplicationShellProps) => {
  const [sidebarStatus, setSidebarStatus] = useState("closed");
  const activePage = appPage.toLowerCase();

  return (
    <>
      <DashboardNavbar setSidebarStatus={setSidebarStatus} userName={userName} />
      <div className="flex">
        <Sidebar
          activeTab={appPage}
          setSidebarStatus={setSidebarStatus}
          sidebarStatus={sidebarStatus}
        />
        <main className="h-[100vh] overflow-auto md:overflow-hidden flex-[5] px-2 pt-20">
          {activePage === "dashboard" ? (
            <UserDashboard
              accounts={accounts}
              summary={summary}
              transactions={transactions}
            />
          ) : activePage === "transactions" ? (
            <Transactions summary={summary} rows={transactions} />
          ) : activePage === "payment_transfers" ? (
            <PaymentsAndTransfers />
          ) : activePage === "budgets" ? (
            <Budgets />
          ) : activePage === "investments" ? (
            <Investments />
          ) : activePage === "data_visualization" ? (
            <DataVisualization />
          ) : activePage === "financial_advisor" ? (
            <Advisor />
          ) : (
            "Error Page"
          )}
        </main>
      </div>
    </>
  );
};

export default ApplicationShell;
