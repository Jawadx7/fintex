"use client";

import Img1 from "../../../public/images/figure-1.png";
import PrimaryButton from "../PrimaryButton";
// import { Globe, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const Hero = () => {
  return (
    <div
      id="home"
      className="bg-gray-200 w-full h-fit md:h-[55vh] lg:h-[100vh] grid grid-cols-1 md:grid-cols-2 align-center gap-2"
    >
      <div className="h-full pt-[6rem] px-[5%] flex align-start justify-center flex-col">
        <h1 className="text-[2rem] lg:text-[3.5rem] capitalize">
          Change the way you use your{" "}
          <span className="text-[#294744]">money</span>
        </h1>

        <p className="mt-4">
          Experience seamless financial management like never before. With our
          innovative fintech solutions, we empower you to take control of your
          finances with ease and efficiency.
        </p>
        <p className="my-5">
          Experience seamless financial management like never before. With our
          innovative fintech solutions, we empower you to take control of your
          finances with ease and efficiency.
        </p>

        <Link href="#footer">
          <PrimaryButton text="Contact US" />
        </Link>
      </div>
      <div className="flex align-center justify-center">
        <Image src={Img1} alt="Image" width={800} />
      </div>
      {/* <div className="bg-blue-600 h-[150vh] sm:h-[70vh] lg:h-full grid grid-cols-1 sm:grid-cols-2 lg:pt-[6rem]">
        <span className="bg-primary border-2 border-white"></span>
        <span className="bg-primary border-2 border-white"></span>
        <span className="bg-primary border-2 border-white"></span>
        <span className="bg-primary border-2 border-white"></span>
      </div> */}
      {/* <div className="w-[90%] mx-auto sm:w-full flex-[1] h-full sm:hidden flex flex-col md:grid grid-cols-2 lg:pt-[6rem]">
        <div className="bg-primary_light text-white place-middle p-[1rem] h-[15rem] sm:h-auto relative">
          <Image src={heroimg} alt="img" className="w-full h-full absolute" />
        </div>
        <div className="bg-brown_light text-[#294744] rounded-l-full place-middle relative h-[15rem] sm:h-auto">
          <h1 className="absolute top-3 right-3 text-[3rem]">500+</h1>
          <h1 className="absolute top-[40%] left-[5%] text-[2rem]">Content</h1>
          <Globe size="70" className="absolute bottom-3 right-3 text-[5rem]" />
        </div>
        <div className="bg-primary_variant text-[#294744] rounded-tr-[10rem] place-middle relative h-[15rem] sm:h-auto">
          <Star size="70" className="absolute top-3 left-3 text-[5rem]" />
          <div className="absolute bottom-3 left-3 flex align-center space-x-1">
            <div className="w-[4rem] h-[4rem] bg-[#294744] rounded-full"></div>
            <div className="w-[4rem] h-[4rem] bg-[#294744] rounded-full"></div>
            <div className="w-[4rem] h-[4rem] bg-[#294744] rounded-full"></div>
          </div>
        </div>
        <div className="bg-primary text-white place-middle relative h-[15rem] sm:h-auto">
          <h1 className="absolute top-3 left-3 text-[3rem]">$125M</h1>
          <h1 className="absolute top-[40%] left-[5%] text-[2rem]">
            Transactions Made
          </h1>
        </div>
      </div> */}
    </div>

    //   {/* hero right */}
  );
};
export default Hero;
