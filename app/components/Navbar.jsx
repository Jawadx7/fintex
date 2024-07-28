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
  return (
    <header className="flex align-center px-[5%] py-[1rem] shadow-md bg-white z-10">
      <div className="logo flex align-center">
        <Image src={logo} alt="logo" className="w-[40px]" />
        <span>Fintex</span>
      </div>

      <Button
        variant="text"
        className="menu_btn text-center text-[#294744]"
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
          <li>
            <a href="#hero">About</a>
          </li>
          <li>
            <a href="#howitworks">How It Works</a>
          </li>
          <li>
            <a href="#testimonial">Testimonial</a>
          </li>
          <li>
            <a href="#faqs">FAQs</a>
          </li>
        </ul>

        <Link href="/login">
          <PrimaryButton text="Get Started" />
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
