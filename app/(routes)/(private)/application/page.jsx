"use client";

// import { useState } from "react";
// import DashboardNavbar from "../../../components/private/DashboardNavbar";
// import Sidebar from "../../../components/private/Sidebar";

// import UserDashboard from "../../../pages/dashboard/UserDashboard";
// import Transactions from "../../../pages/transactions/Transactions";
// import PaymentsAndTransfers from "../../../pages/paymentsNtransfers/Payments_Transfers";

const DashBoard = () => {
  // const [activePage, setActivePage] = useState("Dashboard");
  // const [sidebarStatus, setSidebarStatus] = useState("closed");
  return (
    <>
      <h1>
        users who some how brought themselves here will be redirect to the
        dashboard page ... working on it 😅
      </h1>
      {/* <DashboardNavbar setSidebarStatus={setSidebarStatus} /> */}
      {/* <div className="flex">
        <Sidebar
          setActivePage={setActivePage}
          setSidebarStatus={setSidebarStatus}
          sidebarStatus={sidebarStatus}
        />
        <main className="h-[100vh] overflow-auto md:overflow-hidden flex-[5] px-2 pt-20">
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
      </div> */}
    </>
  );
};

export default DashBoard;
