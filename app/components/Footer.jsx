"use client";

import React, { useState } from "react";
import { StarIcon } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

const Footer = () => {
  const [email, setEmail] = useState("");

  const foterDivs = [
    {
      title: "Products",
      links: [
        "Overview",
        "Instant Funding",
        "Instant Disbursement",
        "Accelerated Transfers",
      ],
    },
    {
      title: "Use Cases",
      links: ["Banking", "Transport", "Bass and Saas", "Payroll and Lending"],
    },
    {
      title: "Resources",
      links: ["Customers", "Blog and News", "Guides", "Testimonials"],
    },
    {
      title: "Company",
      links: [
        "About Company",
        "Opportunity",
        "Contact and Location",
        "Request Features",
      ],
    },
  ];

  return (
    <footer
      id="footer"
      className="mt-5 px-[5%] py-20 flex-col md:flex-row flex md:space-x-5"
    >
      <div className="flex-[3] px-5">
        <h3 className="text-3xl font-bold">Fintex</h3>
        <small className="text-gray-500">
          Financial Solutions at Your Fingertips
        </small>

        <div className="my-10 py-5 px-3 border-y-2 border-dashed border-gray-300 w-full sm:w-2/3 flex align-center">
          <div className="flex align-center pr-3 flex-[1] border-r-2 border-gray-400">
            <StarIcon size={18} />
            <StarIcon size={18} />
            <StarIcon size={18} />
            <StarIcon size={18} />
            <StarIcon size={18} />
          </div>
          <small className="text-gray-500 flex-[1] pl-3">357 Reviews</small>
        </div>

        <form>
          <Input
            type="email"
            aria-label="Enter your email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
          />
          <Button
            type="submit"
            className="mt-3 w-full rounded-l-0 bg-primary text-white hover:bg-primary/90"
          >
            Submit
          </Button>
        </form>
        <small className="text-gray-500">
          By submitting this form you agree that we may collect and process your
          data.
        </small>
      </div>
      <div className="flex-[5] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:mt-0 mt-10">
        {foterDivs.map((item) => (
          <div key={item.title}>
            <h3 className="text-gray-500 mb-3 cursor-default">{item.title}</h3>

            <ul>
              {item.links.map((link) => (
                <li
                  key={link}
                  className="my-5 text-sm text-gray-600 font-semibold cursor-pointer"
                >
                  {link}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
};

export default Footer;
