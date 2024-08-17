"use client";

import Image from "next/image";
import Navbar from "./components/Navbar";
import PrimaryButton from "./components/PrimaryButton";
import Footer from "./components/Footer";
import SectionTag from "./components/SectionTag";
import { useState } from "react";
import { Badge, Globe, Star, CheckCircle } from "lucide-react";
import heroimg from "../public/images/hero_pic.png";
import person1 from "../public/images/person_1.jpg";

export default function Home() {
  const [activetab, setActiveTab] = useState("tab1");
  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <div
        id="hero"
        className="hero pt-[2rem] grid px-[5%] grid-cols-1 md:grid-cols-2 w-full h-fit sm:h-[95vh]"
      >
        <div className="text pt-[4.5rem]">
          <h1 className="text-[3rem] sm:text-[4rem]">
            Change the way you use your{" "}
            <span className="text-[#294744]">money</span>{" "}
          </h1>

          <p className="my-[2rem]">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Odit vero
            neque debitis enim dolores tenetur esse sit minima magni deserunt.
          </p>

          <PrimaryButton text="Contact US" />
        </div>

        {/* hero right */}
        <div className="pt-[4.5rem] flex flex-col md:grid-cols-1 md:grid lg:grid-cols-2">
          <div className="bg-primary_light text-white place-middle p-[1rem] h-[15rem] sm:h-auto relative">
            <Image src={heroimg} alt="img" className="w-full h-full absolute" />
          </div>
          <div className="bg-brown_light text-[#294744] rounded-l-full place-middle relative h-[15rem] sm:h-auto">
            <h1 className="absolute top-3 right-3 text-[3rem]">500+</h1>
            <h1 className="absolute top-[40%] left-[5%] text-[2rem]">
              Content
            </h1>
            <Globe
              size="70"
              className="absolute bottom-3 right-3 text-[5rem]"
            />
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
        </div>
      </div>

      {/* Features */}
      <section id="features">
        <SectionTag text="Features" center={true} />
        <h1 className="h3 text-[1.5rem] text-center mt-[2rem]">
          Powerful Features For Seamless Finance Management
        </h1>

        <div className="mt-[2rem] grid grid-cols-1 md:grid-cols-2">
          {/* tabs */}
          <div>
            <article
              onClick={() => setActiveTab("tab1")}
              className={`p-[2rem] mb-[10px] border-l-[7px] flex flex-col md:flex-row space-x-3 ${
                activetab === "tab1" ? "border-primary" : "border-white"
              } cursor-pointer`}
            >
              <Badge size={50} />
              <div>
                <h3 className="h3 text">Get Your Money Calculated</h3>
                <p>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Aspernatur.
                </p>
              </div>
            </article>
            <article
              onClick={() => setActiveTab("tab2")}
              className={`p-[2rem] mb-[10px] border-l-[7px] flex flex-col md:flex-row space-x-3 ${
                activetab === "tab2" ? "border-primary" : "border-white"
              } cursor-pointer`}
            >
              <Badge size={50} />
              <div>
                <h3 className="h3 text">Get Your Money Calculated</h3>
                <p>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Aspernatur.
                </p>
              </div>
            </article>
            <article
              onClick={() => setActiveTab("tab3")}
              className={`p-[2rem] mb-[10px] border-l-[7px] flex flex-col md:flex-row space-x-3 ${
                activetab === "tab3" ? "border-primary" : "border-white"
              } cursor-pointer`}
            >
              <Badge size={50} />
              <div>
                <h3 className="h3 text">Get Your Money Calculated</h3>
                <p>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Aspernatur.
                </p>
              </div>
            </article>
          </div>

          {/* tabs content */}
          <div className="h-[60vh]">
            <div
              className={`bg-primary h-full w-full flex align-center justify-center ${
                activetab === "tab1" ? "block" : "hidden"
              }`}
            >
              <p>tab content 1</p>
            </div>
            <div
              className={`bg-brown_light h-full w-full flex align-center justify-center ${
                activetab === "tab2" ? "block" : "hidden"
              }`}
            >
              tab content 2
            </div>
            <div
              className={`bg-primary_light h-full w-full flex align-center justify-center ${
                activetab === "tab3" ? "block" : "hidden"
              }`}
            >
              tab content 3
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="howitworks">
        <h1>How it works</h1>
      </section>

      {/* Benefits */}
      <section id="benefits">
        <div className="ml-[10%] sm:ml-1">
          <SectionTag text="Benefits" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 align-center">
          <h1 className="mt-[3rem] text-[2rem] sm:text-[3rem]">
            Make your spend, well spent
          </h1>
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Deleniti in
            adipisci qui nesciunt provident iure doloribus quaerat accusamus
            dicta? Iusto?
          </p>
        </div>

        <div className="w-full md:w-[80%] md:mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-[2rem] gap-3">
          <div className="rounded-[1rem] p-[1rem] shadow-md hover:bg-brown_light">
            <div className="mb-[3rem]">
              <Badge size={60} />
            </div>

            <h1 className="h3 text-[1.2rem]">Benefit One</h1>
            <p className="mb-[2rem] mt-[1rem]">
              Lorem ipsum dolor sit amet, consectetur adipisicing elit.
              Blanditiis ipsum ducimus dignissimos accusantium illum ad vero?
              Ipsum esse exercitationem.
            </p>
            <div>
              <CheckCircle size={40} />
            </div>
          </div>
          <div className="rounded-[1rem] p-[1rem] shadow-md hover:bg-brown_light">
            <div className="mb-[3rem]">
              <Badge size={60} />
            </div>

            <h1 className="h3 text-[1.2rem]">Benefit One</h1>
            <p className="mb-[2rem] mt-[1rem]">
              Lorem ipsum dolor sit amet, consectetur adipisicing elit.
              Blanditiis ipsum ducimus dignissimos accusantium illum ad vero?
              Ipsum esse exercitationem.
            </p>
            <div>
              <CheckCircle size={40} />
            </div>
          </div>
          <div className="rounded-[1rem] p-[1rem] shadow-md hover:bg-brown_light transition-smooth">
            <div className="mb-[3rem]">
              <Badge size={60} />
            </div>

            <h1 className="h3 text-[1.2rem]">Benefit One</h1>
            <p className="mb-[2rem] mt-[1rem]">
              Lorem ipsum dolor sit amet, consectetur adipisicing elit.
              Blanditiis ipsum ducimus dignissimos accusantium illum ad vero?
              Ipsum esse exercitationem.
            </p>
            <div>
              <CheckCircle size={40} />
            </div>
          </div>
        </div>
      </section>

      {/* Testomonial */}
      <div
        id="testimonial"
        className="bg-primary text-white px-[5%] py-[3rem] my-[2rem]"
      >
        {/* top */}
        <div className="flex align-center justify-between">
          <div>
            <h1 className="h3 text-[2.5rem]">Real Stories</h1>
            <h1 className="h3 text-[2.5rem]">From Enterprenuers</h1>
          </div>

          <div>tab</div>
        </div>

        {/* post content */}
        <div className="flex space-x-[5rem] my-[2rem] w-full mx-auto lg:w-[70%]">
          {/* user details */}
          <div className="flex-[1]">
            <Image
              src={person1}
              alt=""
              className="w-[5rem] h-[5rem] rounded-full"
            />
          </div>
          {/* user post */}
          <p className="flex-[6]">
            Lorem ipsum dolor, sit amet consectetur adipisicing elit. Ratione
            sit necessitatibus debitis numquam delectus dolore alias doloribus
            libero repellat! Quam laborum, ad expedita labore placeat facere
            error repudiandae? Veniam nesciunt est dignissimos maiores delectus
            vel repudiandae culpa, voluptatem ducimus nobis.
          </p>
        </div>
      </div>

      {/* CTA */}
      <section id="cta">
        <h1>CTA</h1>
      </section>

      {/* FAQ Section */}
      <section id="faqs">
        <h1>FAQ Section</h1>
      </section>

      {/* footer */}
      <Footer />
    </>
  );
}
