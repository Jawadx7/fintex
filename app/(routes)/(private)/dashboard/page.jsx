"use client";

import { useState } from "react";
import DashboardNavbar from "../../../components/private/DashboardNavbar";
import Sidebar from "../../../components/private/Sidebar";

import UserDashboard from "../../../pages/dashboard/UserDashboard";
import Transactions from "../../../pages/transactions/Transactions";
import PaymentsAndTransfers from "../../../pages/paymentsNtransfers/Payments_Transfers";

const DashBoard = () => {
  const [activePage, setActivePage] = useState("Dashboard");
  return (
    <>
      <DashboardNavbar />
      <div className="flex">
        <Sidebar setActivePage={setActivePage} />
        <main className="pl-[17rem] pt-[5rem]">
          {activePage === "Dashboard" ? (
            <UserDashboard />
          ) : activePage === "Transactions" ? (
            <Transactions />
          ) : activePage === "Payment & Transfers" ? (
            <PaymentsAndTransfers />
          ) : (
            ""
          )}
        </main>
      </div>
    </>
  );
};

export default DashBoard;
