"use client";
import TransactionsTable from "./TransactionsTable";
import { Wallet, ArrowBigDown, ArrowBigUp } from "lucide-react";

const Transactions = () => {
  return (
    <div className="overflow-y-auto md:overflow-y-scroll">
      <div className="w-full flex flex-col md:flex-row">
        {/* balance */}
        <div className="flex-[1]">
          {/* <p className="m-3 text-primary">Total Balance</p> */}
          <div className="h-auto shadow-md p-3 rounded-md bg-white hover:bg-primary text-primary hover:text-white transition-smooth cursor-default relative">
            {/* <MoreVertical className="absolute top-2 right-2 cursor-pointer" /> */}
            <p className="my-3">All Time</p>
            <div className="flex align-center space-x-3">
              <div className="place-middle bg-primary_fade w-12 h-12 rounded-full">
                <Wallet size={30} color="white" />
              </div>
              <h1 className="h3 text-[2rem]">$2190</h1>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="flex-[3]">
          {/* <p className="m-3 text-primary">Transactions</p> */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:ml-2 ml-0">
            <div className="flex-[3] shadow-md p-3 rounded-md bg-white hover:bg-primary text-primary hover:text-white transition-smooth cursor-default relative">
              <div className="flex align-center space-x-3">
                <ArrowBigUp size={80} color="green" />
                <div>
                  <p className="my-3">Income</p>
                  <h1 className="h3 text-[2rem]">$2900</h1>
                </div>
              </div>
            </div>
            <div className="flex-[3] shadow-md p-3 rounded-md bg-white hover:bg-primary text-primary hover:text-white transition-smooth cursor-default relative">
              <div className="flex align-center space-x-3">
                <ArrowBigDown size={80} color="red" />
                <div>
                  <p className="my-3">Outcome</p>
                  <h1 className="h3 text-[2rem]">$2900</h1>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <TransactionsTable />
    </div>
  );
};

export default Transactions;
