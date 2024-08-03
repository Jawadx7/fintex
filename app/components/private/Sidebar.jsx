"use client";
import Image from "next/image";
import logo from "../../../public/images/logo.ico";

import Link from "next/link";
import { account_tabs } from "../../../public/data/sidebar_tabs";
import { tools_tabs } from "../../../public/data/sidebar_tabs";
import { link_tabs } from "../../../public/data/sidebar_tabs";
import { useState } from "react";

const Sidebar = ({ setActivePage }) => {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const handleActiveTab = (e) => {
    setActiveTab(e.target.innerText);
    setActivePage(e.target.innerText);
  };
  return (
    <div className="w-[16%] h-[100vh] fixed top-0 left-0 py-[1rem] bg-white z-20 shadow-md">
      <div className="flex align-center space-x-2 mx-[1rem] mt-[1rem]">
        <Image src={logo} alt="" width={30} />
        <h1 className="h3 text-[1.3rem]">Fintex</h1>
      </div>
      {/* <ArrowRightCircle />
      <ArrowLeftCircle /> */}

      <aside>
        <div className="pt-[2rem]">
          <small className="text-primary_fade m-[15px]">Menu</small>
          <ul>
            {account_tabs.map((tab) => (
              <li
                key={Math.random() * 10}
                className={`flex align-center space-x-2 text-primary hover:bg-primary_fade p-[1rem] hover:text-white cursor-pointer ${
                  activeTab === tab.name ? "bg-primary text-white" : ""
                }`}
                onClick={handleActiveTab}
              >
                <span>{tab.icon}</span>
                <small className="text-[14px]">{tab.name}</small>
              </li>
            ))}
          </ul>

          <div className="w-[90%] h-[1.5px] bg-primary my-[1rem] mx-auto"></div>
          <small className="text-primary_fade m-[15px]">Tools</small>
          <ul>
            {tools_tabs.map((tab) => (
              <li
                key={Math.random() * 10}
                className={`flex align-center space-x-2 text-primary hover:bg-primary_fade p-[1rem] hover:text-white cursor-pointer ${
                  activeTab === tab.name ? "bg-primary text-white" : ""
                }`}
                onClick={handleActiveTab}
              >
                <span>{tab.icon}</span>
                <small className="text-[14px]">{tab.name}</small>
              </li>
            ))}

            <div className="w-[90%] h-[1.5px] bg-primary my-[1rem] mx-auto"></div>
            <small className="text-primary_fade m-[15px]">Account</small>

            <ul className="mx-[10px]">
              {link_tabs.map((item) => (
                <li
                  href={item.path}
                  key={Math.random() * 10}
                  className="cursor-pointer group relative my-[5px] w-fit"
                >
                  {item.path && (
                    <Link href={item.path}>
                      <small className="text-primary group-hover:ml-[2rem] transition-smooth text-[14px]">
                        {item.name}
                      </small>
                      <span className="absolute top-[50%] left-[-5px] w-[2rem] h-[3px] bg-primary rounded-sm opacity-[0] group-hover:opacity-[1] transition-smooth-slow"></span>
                    </Link>
                  )}

                  {!item.path && (
                    <div>
                      <small className="text-primary group-hover:ml-[2rem] transition-smooth text-[14px]">
                        {item.name}
                      </small>
                      <span className="absolute top-[50%] left-[-5px] w-[2rem] h-[3px] bg-primary rounded-sm opacity-[0] group-hover:opacity-[1] transition-smooth-slow"></span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </ul>
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;
