"use client";

import { useState } from "react";
import DashboardNavbar from "../../../../components/private/DashboardNavbar";
import Sidebar from "../../../../components/private/Sidebar";

import UserDashboard from "../../../../pages/dashboard/UserDashboard";
import Transactions from "../../../../pages/transactions/Transactions";
import PaymentsAndTransfers from "../../../../pages/paymentsNtransfers/Payments_Transfers";
import Budgets from "../../../../pages/Budgets/Budgets";
import Investments from "../../../../pages/Investments/Investments";
import DataVisualization from "../../../../pages/Data_Visualization/DataVisualization";
import Advisor from "../../../../pages/Advisor/Advisor";

const ApplicationPage = ({ params }) => {
  const [sidebarStatus, setSidebarStatus] = useState("closed");
  return (
    <>
      <DashboardNavbar setSidebarStatus={setSidebarStatus} />
      <div className="flex">
        <Sidebar
          activeTab={params.app_page}
          setSidebarStatus={setSidebarStatus}
          sidebarStatus={sidebarStatus}
        />
        <main className="h-[100vh] overflow-auto md:overflow-hidden flex-[5] px-2 pt-20">
          {params.app_page.toLowerCase() === "dashboard" ? (
            <UserDashboard />
          ) : params.app_page.toLowerCase() === "transactions" ? (
            <Transactions />
          ) : params.app_page.toLowerCase() === "payment_transfers" ? (
            <PaymentsAndTransfers />
          ) : params.app_page.toLowerCase() === "budgets" ? (
            <Budgets />
          ) : params.app_page.toLowerCase() === "investments" ? (
            <Investments />
          ) : params.app_page.toLowerCase() === "data_visualization" ? (
            <DataVisualization />
          ) : params.app_page.toLowerCase() === "data_visualization" ? (
            <DataVisualization />
          ) : params.app_page.toLowerCase() === "financial_advisor" ? (
            <Advisor />
          ) : (
            "Error Page"
          )}
        </main>
      </div>
    </>
  );
};
export default ApplicationPage;
