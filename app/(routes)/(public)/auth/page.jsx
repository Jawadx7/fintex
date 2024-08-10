"use client";

import { useState } from "react";
import Image from "next/image";
import LoginForm from "../../../components/auth/LoginForm";
import SignUpForm from "../../../components/auth/SignUpForm";
import EmailVerification from "../../../components/auth/EmailVerification";
import img from "../../../../public/images/figure-1.png";
import "../../../styles/auth.scss";

const AuthPage = () => {
  const [currentPage, setCurrentPage] = useState("login");
  return (
    <main className="grid grid-cols-1 md:grid-cols-2 h-[100vh] w-full">
      <div className="form h-full w-full md:w-[85%] lg:w-[70%] mx-auto p-[1rem] sm:p-[2rem] place-middle">
        {currentPage === "login" ? (
          <LoginForm setCurrentPage={setCurrentPage} />
        ) : currentPage === "signup" ? (
          <SignUpForm setCurrentPage={setCurrentPage} />
        ) : (
          <EmailVerification />
        )}
      </div>
      <div className="auth_figure hidden md:block w-full h-full place-middle">
        <Image src={img} alt="auth image" className="img z-10" />
      </div>
    </main>
  );
};

export default AuthPage;
