"use client";

import img from "../../../../../public/images/figure-1.png";
import logo from "../../../../../public/images/logo.ico";
import "../../../../styles/auth.scss";
import EmailVerification from "../../../../components/auth/EmailVerification";
import Image from "next/image";
import Link from "next/link";

const VerifyEmail = () => {
  return (
    <div>
      <Link href="/" className="logo flex align-center absolute left-5 top-5">
        <Image src={logo} alt="logo" className="w-[30px]" />
        <span>Fintex</span>
      </Link>
      <main className="grid grid-cols-1 md:grid-cols-2 h-[100vh] w-full">
        <div className="form h-full w-full md:w-[85%] lg:w-[70%] mx-auto p-[1rem] sm:p-[2rem] place-middle">
          <EmailVerification />
        </div>
        <div className="auth_figure hidden md:block w-full h-full place-middle">
          <Image src={img} alt="auth image" className="img z-10" />
        </div>
      </main>
    </div>
  );
};
export default VerifyEmail;
