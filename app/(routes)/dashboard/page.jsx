"use client";

import ButtonLink from "../../components/ButtonLink";

const DashBoard = () => {
  return (
    <main className="p-[2rem]">
      <h1 className="h3 text-[2rem] mb-[2rem]">Dashboard</h1>
      <ButtonLink text="Home" path="/" />
    </main>
  );
};

export default DashBoard;
