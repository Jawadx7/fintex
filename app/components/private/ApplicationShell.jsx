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

const ApplicationShell = ({ appPage }) => {
  const [sidebarStatus, setSidebarStatus] = useState("closed");
  const activePage = appPage.toLowerCase();

  return (
    <>
      <DashboardNavbar setSidebarStatus={setSidebarStatus} />
      <div className="flex">
        <Sidebar
          activeTab={appPage}
          setSidebarStatus={setSidebarStatus}
          sidebarStatus={sidebarStatus}
        />
        <main className="h-[100vh] overflow-auto md:overflow-hidden flex-[5] px-2 pt-20">
          {activePage === "dashboard" ? (
            <UserDashboard />
          ) : activePage === "transactions" ? (
            <Transactions />
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