"use client";

import SectionTag from "../SectionTag";
import { Badge } from "lucide-react";
import { useState } from "react";
import PrimaryButton from "../PrimaryButton";

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
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Deleniti in
          adipisci qui nesciunt provident iure doloribus quaerat accusamus
          dicta? Iusto?
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
            <Badge size={50} />
            <div>
              <h3 className="h3 text">New Payment Stratgies</h3>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Aspernatur.
              </p>
            </div>
          </article>
          <article
            onClick={() => setActiveTab("tab2")}
            className={`p-[2rem] mb-[10px] border-l-[7px] flex flex-col md:flex-row space-x-3 ${
              activetab === "tab2" ? "border-primary" : "border-white"
            } cursor-pointer`}
          >
            <Badge size={50} />
            <div>
              <h3 className="h3 text">Virtual Cards</h3>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Aspernatur.
              </p>
            </div>
          </article>
          <article
            onClick={() => setActiveTab("tab3")}
            className={`p-[2rem] mb-[10px] border-l-[7px] flex flex-col md:flex-row space-x-3 ${
              activetab === "tab3" ? "border-primary" : "border-white"
            } cursor-pointer`}
          >
            <Badge size={50} />
            <div>
              <h3 className="h3 text">Get Your Money Calculated</h3>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Aspernatur.
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
            <h3 className="mt-[3rem] text-left text-5xl font-[100]">
              New payments with swift, flexible, and reliable
            </h3>
            <p className="my-3 text-gray-600">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsa rem,
              delectus dicta quaerat quidem cum suscipit perferendis tempore
              ullam laborum vel labore totam, voluptates dolores dolorem unde.
              Minus, aliquid quo?
            </p>
            <PrimaryButton text="See Details" />
          </div>
          <div
            className={`w-full h-full p-2 ${
              activetab === "tab2" ? "block" : "hidden"
            }`}
          >
            <h3 className="mt-[3rem] text-left text-5xl font-[100]">
              Enjoy Our Virtual Credit Cards
            </h3>
            <p className="my-3 text-gray-600">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsa rem,
              delectus dicta quaerat quidem cum suscipit perferendis tempore
              ullam laborum vel labore totam, voluptates dolores dolorem unde.
              Minus, aliquid quo?
            </p>
            <PrimaryButton text="See Details" />
          </div>
          <div
            className={`w-full h-full p-2 ${
              activetab === "tab3" ? "block" : "hidden"
            }`}
          >
            <h3 className="mt-[3rem] text-left text-5xl font-[100]">Tab 3</h3>
            <p className="my-3 text-gray-600">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsa rem,
              delectus dicta quaerat quidem cum suscipit perferendis tempore
              ullam laborum vel labore totam, voluptates dolores dolorem unde.
              Minus, aliquid quo?
            </p>
            <PrimaryButton text="See Details" />
          </div>
        </div>
      </div>
    </section>
  );
};
export default Benefits;
