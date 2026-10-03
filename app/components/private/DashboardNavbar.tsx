"use client";

import { ArrowRightCircle, MessageCircle, BellIcon, LogOut } from "lucide-react";
import person1 from "../../../public/images/person_1.jpg";
import Image from "next/image";

import { logOutUser } from "@/app/actions/auth";

type DashboardNavbarProps = {
  setSidebarStatus: (status: string) => void;
  userName?: string | null;
};

const DashboardNavbar = ({ setSidebarStatus, userName }: DashboardNavbarProps) => {
  const greeting = userName?.trim().split(" ")[0] ?? "there";

  return (
    <header className="w-full h-[4rem] fixed top-0 left-0 bg-white z-10 flex justify-between align-center px-[5%] lg:pl-[18rem]">
      <ArrowRightCircle
        size={40}
        className="absolute top-2 left-2 bg-white cursor-pointer"
        onClick={() => setSidebarStatus("opened")}
      />

      <h1 className="h3 text-base md:text-xl ml-8 md:ml-5">
        Xup, <span className="text-primary">{greeting}</span>
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

        <div className="mx-2 mr-5 flex align-center space-x-2">
          <Image
            src={person1}
            alt="profile_pic"
            className="w-10 h-10 rounded-full"
          />
          <form action={logOutUser}>
            <button
              type="submit"
              className="flex items-center gap-1 text-sm text-primary hover:text-black transition-smooth cursor-pointer"
            >
              <LogOut size={16} />
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
};

export default DashboardNavbar;
