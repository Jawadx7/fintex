"use client";

import Image from "next/image";
import SignUpForm from "../../../../components/auth/SignUpForm";
import img from "../../../../../public/images/figure-1.png";
import logo from "../../../../../public/images/logo.ico";
import "../../../../styles/auth.scss";
import Link from "next/link";

const SignUp = () => {
  return (
    <main className="grid grid-cols-1 md:grid-cols-2 h-[100vh] w-full">
      <div className="form h-full w-full sm:w-[90%] mx-auto p-[1rem] sm:p-[2rem] flex flex-col justify-center">
        <Link href="/" className="flex align-center space-x-2 my-3">
          <Image src={logo} alt="logo" className="w-[30px]" />
          <span>Fintex</span>
        </Link>
        <SignUpForm />
      </div>
      <div className="auth_figure hidden md:block w-full h-[70vh] md:h-full place-middle bg-primary_fade">
        <Image src={img} alt="auth image" className="img z-10" />
      </div>
    </main>
  );
};
export default SignUp;
