"use client";
import Image from "next/image";
import Link from "next/link";

import PrimaryButton from "./PrimaryButton";
import "../styles/navbar.scss";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@mui/material";
import logo from "../../public/images/logo.ico";

const Navbar = () => {
  const [shownav, setShowNav] = useState("closed");

  const navLinks = [
    {
      text: "Home",
      path: "#home",
    },
    {
      text: "About",
      path: "#about",
    },
    {
      text: "Features",
      path: "#fitures",
    },
    {
      text: "Benefits",
      path: "#benefits",
    },
    {
      text: "Testimonial",
      path: "#testimonial",
    },
    {
      text: "FAQs",
      path: "#faqs",
    },
    {
      text: "Dashboard",
      path: "/dashboard",
    },
  ];
  return (
    <header className="flex align-center px-[5%] py-[1rem] shadow-md bg-white z-10">
      <div className="logo flex align-center">
        <Image src={logo} alt="logo" className="w-[40px]" />
        <span>Fintex</span>
      </div>

      <Button
        variant="text"
        className="menu_btn text-center text-primary"
        onClick={() => setShowNav("opened")}
      >
        <Menu />
      </Button>
      <div className={`menu ${shownav === "closed" ? "closed" : "opened"}`}>
        <Button
          variant="text"
          className="close_btn text-center text-white text-[3rem]"
          onClick={() => setShowNav("closed")}
        >
          <X />
        </Button>

        <ul>
          {navLinks.map((link) => (
            <li key={link.text}>
              <a href={link.path}>{link.text}</a>
            </li>
          ))}
        </ul>
        <Link href="/auth/signup">
          <PrimaryButton text="Get Started" />
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
