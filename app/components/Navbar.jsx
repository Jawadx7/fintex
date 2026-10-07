"use client";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";

import PrimaryButton from "./PrimaryButton";
import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { cn } from "@/lib/utils";
import logo from "../../public/images/logo.ico";

const navLinks = [
  { text: "Home", path: "#home" },
  { text: "About", path: "#about" },
  { text: "Features", path: "#fitures" },
  { text: "Benefits", path: "#benefits" },
  { text: "Testimonial", path: "#testimonial" },
  { text: "FAQs", path: "#faqs" },
];

const Navbar = () => {
  return (
    <header className="fixed left-0 top-0 z-10 grid w-full grid-cols-[1fr_auto] items-center bg-white px-[5%] py-[1rem] shadow-md md:grid-cols-[1fr_auto_1fr]">
      <Link href="/" className="flex items-center gap-2 text-2xl font-extrabold">
        <Image src={logo} alt="Fintex" className="w-[40px]" />
        <span>Fintex</span>
      </Link>

      {/* Desktop menu: inline from md up, replaced by the Sheet below it. */}
      <nav className="col-start-2 hidden items-center md:flex">
        <ul className="flex items-center gap-4 lg:gap-6">
          {navLinks.map((link) => (
            <li key={link.text} className="text-sm font-medium">
              <a
                href={link.path}
                className="text-muted-foreground transition-smooth hover:text-primary"
              >
                {link.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="col-start-3 hidden items-center justify-self-end gap-2 md:flex">
        <Link href="/auth/login">
          <Button
            variant="outline"
            className="h-9 px-3 text-sm font-medium text-primary"
          >
            Sign in
          </Button>
        </Link>
        <Link href="/auth/signup">
          <PrimaryButton
            text="Get Started"
            className="h-9 w-fit px-3 text-sm font-medium"
          />
        </Link>
      </div>

      {/* Mobile off-canvas, replacing the .menu/.opened/.closed SCSS rules. */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation menu"
            className="text-primary md:hidden"
          >
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className={cn("flex flex-col gap-8 bg-primary p-8", "w-[80%]")}
        >
          <SheetHeader>
            <SheetTitle className="text-left text-lg font-extrabold text-white">
              Fintex
            </SheetTitle>
          </SheetHeader>
          <ul className="flex flex-col items-start gap-4">
            {navLinks.map((link) => (
              <li key={link.text} className="font-medium">
                <Link
                  href={link.path}
                  className="rounded px-2.5 py-1 text-white transition-smooth hover:bg-white hover:text-primary"
                >
                  {link.text}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/auth/signup" className="mt-auto">
            <PrimaryButton
              text="Get Started"
              className="w-full bg-white text-primary hover:bg-white/90"
            />
          </Link>
          <Link href="/auth/login">
            <Button
              variant="outline"
              className="w-full border-white bg-transparent text-white hover:bg-white hover:text-primary"
            >
              Sign in
            </Button>
          </Link>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default Navbar;