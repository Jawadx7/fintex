"use client";

import img from "../../../../../public/images/figure-1.png";
import logo from "../../../../../public/images/logo.ico";
import "../../../../styles/auth.scss";
import LoginForm from "../../../../components/auth/LoginForm";
import Image from "next/image";
import Link from "next/link";

const LogIn = () => {
  return (
    <div>
      <main className="grid grid-cols-1 md:grid-cols-2 h-[100vh] w-full">
        <div className="form h-full w-full md:w-[85%] lg:w-[70%] mx-auto p-[1rem] sm:p-[2rem] flex flex-col justify-center">
          <Link href="/" className="flex align-center space-x-2 my-3">
            <Image src={logo} alt="logo" className="w-[30px]" />
            <span>Fintex</span>
          </Link>
          <LoginForm />
        </div>
        <div className="auth_figure hidden md:block w-full h-[70vh] md:h-full place-middle bg-primary_fade">
          <Image src={img} alt="auth image" className="img z-10" />
        </div>
      </main>
    </div>
  );
};
export default LogIn;
