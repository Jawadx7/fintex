"use client";

import SectionTag from "../SectionTag";
// import { DollarSign, CardCredit, ChartCandlestick } from "lucide-react";
import { DollarSign, ChartCandlestick, CreditCard } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import PaymentsImg from "../../../public/images/vectors/transactions.svg";
import CardsImg from "../../../public/images/vectors/credit_card.svg";
import MoneyImg from "../../../public/images/vectors/personal_finance.svg";

const Benefits = () => {
  const [activetab, setActiveTab] = useState("tab1");
  return (
    <section id="benefits">
      <SectionTag text="Benefits" center={true} />
      <div className="grid grid-cols-1 md:grid-cols-2 align-center">
        <h1 className="mt-[3rem] text-[2rem] sm:text-[3rem]">
          Make your spend, well spent
        </h1>
        <p>
          Optimize every transaction with tools designed to give you full
          control over your spending. Our platform helps you track, manage, and
          budget effortlessly, ensuring that every penny is spent with purpose.
          From detailed spending insights to tailored recommendations, we
          empower you to make informed financial decisions that align with your
          goals.
        </p>
      </div>

      <div className="mt-[2rem] grid grid-cols-1 md:grid-cols-2">
        {/* tabs */}
        <div>
          <article
            onClick={() => setActiveTab("tab1")}
            className={`p-[2rem] mb-[10px] border-l-[7px] flex flex-col md:flex-row space-x-3 ${
              activetab === "tab1" ? "border-primary" : "border-white"
            } cursor-pointer`}
          >
            <DollarSign size={50} />
            <div>
              <h3 className="h3 text">New Payment Stratgies</h3>
              <p>
                Innovative solutions that offer flexibility, speed, and security
                for modern transactions.
              </p>
            </div>
          </article>
          <article
            onClick={() => setActiveTab("tab2")}
            className={`p-[2rem] mb-[10px] border-l-[7px] flex flex-col md:flex-row space-x-3 ${
              activetab === "tab2" ? "border-primary" : "border-white"
            } cursor-pointer`}
          >
            <CreditCard size={50} />
            <div>
              <h3 className="h3 text">Virtual Cards</h3>
              <p>
                Secure and manage your online purchases with instant virtual
                cards designed for convenience.
              </p>
            </div>
          </article>
          <article
            onClick={() => setActiveTab("tab3")}
            className={`p-[2rem] mb-[10px] border-l-[7px] flex flex-col md:flex-row space-x-3 ${
              activetab === "tab3" ? "border-primary" : "border-white"
            } cursor-pointer`}
          >
            <ChartCandlestick size={50} />
            <div>
              <h3 className="h3 text">Get Your Money on Track</h3>
              <p>
                Track your spending in real-time and optimize your financial
                management with ease.
              </p>
            </div>
          </article>
        </div>

        {/* tabs content */}
        <div className="h-[60vh]">
          <div
            className={`w-full h-full p-2 ${
              activetab === "tab1" ? "block" : "hidden"
            }`}
          >
            <Image src={PaymentsImg} alt="payment-image" width={300} />
            <h3 className="mt-[3rem] text-left text-4xl font-[500]">
              New Payments with Swift, Flexible, and Reliable Solutions
            </h3>
            <p className="my-3 text-gray-600">
              Experience the future of payments with a system designed to be
              swift, flexible, and highly reliable. Our platform ensures
              seamless financial transactions that adapt to your needs,
              providing a smooth and secure payment process every time.
            </p>
          </div>
          <div
            className={`w-full h-full p-2 ${
              activetab === "tab2" ? "block" : "hidden"
            }`}
          >
            <Image src={CardsImg} alt="cards-image" width={180} />
            <h3 className="mt-[3rem] text-left text-4xl font-[500]">
              Enjoy Our Virtual Credit Cards
            </h3>
            <p className="my-3 text-gray-600">
              Unlock the convenience and security of our virtual credit cards.
              Designed for your digital lifestyle, our cards offer instant
              access to funds, enhanced protection, and full control over your
              spending. Say goodbye to traditional cards and experience a
              smarter, more flexible way to manage your finances.
            </p>
          </div>
          <div
            className={`w-full h-full p-2 ${
              activetab === "tab3" ? "block" : "hidden"
            }`}
          >
            <Image src={MoneyImg} alt="personal-finance-image" width={170} />
            <h3 className="mt-[3rem] text-left text-4xl font-[500]">
              Seamless Money Management
            </h3>
            <p className="my-3 text-gray-600">
              Simplify your financial life with tools that allow you to track,
              budget, and manage your money in real-time. Our platform ensures
              that every penny is accounted for and working towards your
              financial goals.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Benefits;
