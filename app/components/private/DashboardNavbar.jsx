"use client";

import { ArrowRightCircle, MessageCircle, BellIcon } from "lucide-react";
import person1 from "../../../public/images/person_1.jpg";
import Image from "next/image";

const DashboardNavbar = ({ setSidebarStatus }) => {
  return (
    <header className="w-full h-[4rem] fixed top-0 left-0 bg-white z-10 flex justify-between align-center px-[5%] lg:pl-[18rem]">
      <ArrowRightCircle
        size={40}
        className="absolute top-2 left-2 bg-white cursor-pointer"
        onClick={() => setSidebarStatus("opened")}
      />

      <h1 className="h3 text-base md:text-xl ml-8 md:ml-5">
        Xup, <span className="text-primary">Dorix</span>
      </h1>

      <div className="flex align-center space-x-3 md:space-x-5">
        <div className="mx-3 flex align-center space-x-2">
          <div className="relative cursor-pointer">
            <MessageCircle />
            <span className="bg-red-500 text-white w-5 h-5 text-[10px] rounded-full place-middle absolute top-[-25%] left-[-25%]">
              3
            </span>
          </div>
          <div className="relative cursor-pointer">
            <BellIcon />
            <span className="bg-red-500 text-white w-5 h-5 text-[10px] rounded-full place-middle absolute top-[-25%] left-[-25%]">
              99+
            </span>
          </div>
        </div>

        <div className="mx-2 mr-5">
          <Image
            src={person1}
            alt="profile_pic"
            className="w-10 h-10 rounded-full"
          />
        </div>
      </div>
    </header>
  );
};

export default DashboardNavbar;
