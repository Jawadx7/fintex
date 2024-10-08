"use client";
import {
  Wallet,
  HandCoins,
  PiggyBank,
  MoreVertical,
  Coins,
  Plus,
  ArrowRight,
} from "lucide-react";
import AnalyticsandExpenciesSection from "./AnalyticsandExpenciesSection";
import { Button } from "@mui/material";
import Image from "next/image";
import "../../styles/dashboard.scss";

import { quick_transfers } from "../../../public/data/dashboard_dummy_data";
import Card from "../../components/Card";
import TransactionsSection from "./TransactionsSection";

const UserDashboard = () => {
  const account = [
    {
      id: 1,
      name: "Balance",
      amount: 2190,
      icon: <Wallet size={30} color="white" />,
    },
    {
      id: 2,
      name: "Income",
      amount: 2900,
      icon: <HandCoins size={30} color="white" />,
    },
    {
      id: 3,
      name: "Savings",
      amount: 500,
      icon: <PiggyBank size={30} color="white" />,
    },
    {
      id: 4,
      name: "Expense",
      amount: 210,
      icon: <Coins size={30} color="white" />,
    },
  ];
  return (
    <div className="dashboard flex-col flex md:flex-row">
      <div className="dashboard_left flex-[4] p-2 py-2 md:h-[90vh]">
        <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-4">
          {account.map((accountItem) => (
            <div
              key={accountItem.id}
              className="shadow-md p-3 rounded-md bg-white hover:bg-primary text-primary hover:text-white transition-smooth cursor-default relative"
            >
              <MoreVertical className="absolute top-2 right-2 cursor-pointer" />
              <div className="place-middle bg-primary_fade w-12 h-12 rounded-full">
                {accountItem.icon}
              </div>

              <p className="my-3">{accountItem.name}</p>

              <h1 className="h3 text-[2rem]">${accountItem.amount}</h1>
            </div>
          ))}
        </div>

        {/* Analytics and Budget */}
        <AnalyticsandExpenciesSection />

        <TransactionsSection />
      </div>

      {/* right - other tools for account and transfers */}
      <div className="dashboard_right flex-[2] pb-2 mb-3 md:mb-0 sm:px-3 md:mt-0 mt-5 h-fit md:h-[90vh]">
        <div className="shadow-md bg-white rounded-md p-3 mb-3">
          <div className="flex align-center justify-between">
            <span>My Cards</span>
            <MoreVertical className="cursor-pointer" />
          </div>

          <Card
            name="VISA"
            number="2945 4829 1039 2930"
            provider="ABSA Bank"
            date="7/10"
          />

          <div className="my-3 bg-primary_light p-2 rounded-md text-white">
            <small>Total Balance</small>
            <div className="py-2 border-b-2 border-primary_fade flex align-center justify-between">
              <span className="h3 text-xl text-primary">$29393</span>
              <span>hello</span>
            </div>
            <div className="grid grid-cols-2 mt-2">
              <small>Currency</small>
              <small>Status</small>
            </div>
            <div className="grid grid-cols-2 text-primary">
              <p>USD : $</p>
              <p>Active</p>
            </div>
          </div>

          <Button
            variant="contained"
            className="flex align-center justify-center space-x-3 bg-primary text-white p-3 rounded-md cursor-pointer mt-2 hover:bg-primary_fade w-full"
          >
            <Plus />
            <span>Add New Card</span>
          </Button>
        </div>
        <div className="shadow-md bg-white rounded-md p-3">
          <span className="text-center">Quick Transfer</span>
          <div className="flex flex-wrap align-center space-x-2 my-3">
            {quick_transfers.map((person) => (
              <Image
                key={Math.random() * 20}
                src={person.image}
                alt="person image"
                className="w-10 h-10 rounded-full cursor-pointer"
              />
            ))}
            <ArrowRight className="cursor-pointer" />
          </div>

          <div className="mb-3">
            <label for="card_number">Card Number</label> <br />
            <input
              type="text"
              name="card_number"
              placeholder="284 895 8695 9599"
              className="outline-none border-none bg-primary text-white rounded-md p-3 w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              variant="contained"
              className="flex align-center justify-center space-x-3 bg-primary text-white p-3 rounded-md cursor-pointer mt-2 hover:bg-primary_fade w-full"
            >
              Send Money
            </Button>
            <Button
              variant="contained"
              className="flex align-center justify-center space-x-3 bg-primary_light text-primary p-3 rounded-md cursor-pointer mt-2 hover:bg-primary_light w-full"
            >
              Save as draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
