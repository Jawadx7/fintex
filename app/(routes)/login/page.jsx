"use client";

import ButtonLink from "../../components/ButtonLink";
import React from "react";

const LogIn = () => {
  return (
    <main className="grid grid-cols-2 h-[100vh] w-full">
      <div className="form h-full">
        <div className="text-[3rem]">LogIn Page</div>
        <ButtonLink path="/" text="Home Page" />
        <br />
        <br />
        <ButtonLink path="/signup" text="Sign Up" />
      </div>
      <div className="figure hidden md:block bg-primary h-full"></div>
    </main>
  );
};

export default LogIn;
