"use client";

import PrimaryButton from "./components/PrimaryButton";
import Link from "next/link";
import Image from "next/image";
import NotFoundImg from "../public/images/vectors/404.svg";

const NotFound = () => {
  return (
    <div className="flex align-center justify-center flex-col p-5">
      <Image src={NotFoundImg} width={500} alt="page-not-found" />
      <h1 className="text-base sm:text-2xl font-[300] my-5">
        The Page You Requested Was Not Found
      </h1>

      <div className="flex align-center space-x-5">
        <Link href="/">
          <PrimaryButton text="Go Back Home" />
        </Link>
        <Link href="/application/dashboard">
          <PrimaryButton text="See Dashboard" />
        </Link>
      </div>
    </div>
  );
};
export default NotFound;
