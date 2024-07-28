"use client";

import ButtonLink from "../../components/ButtonLink";

const SignUp = () => {
  return (
    <main className="grid grid-cols-2 h-[100vh] w-full">
      <div className="form h-full">
        <div className="text-[3rem]">SignUp Page</div>
        <ButtonLink path="/" text="Home Page" />
        <br />
        <br />
        <ButtonLink path="/login" text="LogIn" />
      </div>
      <div className="figure hidden md:block bg-primary h-full"></div>
    </main>
  );
};

export default SignUp;
