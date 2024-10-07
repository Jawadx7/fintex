"use client";

import Navbar from "./components/Navbar";
import Hero from "./components/home/Hero";
import About from "./components/home/About";
import Features from "./components/home/Features";
import Benefits from "./components/home/Benefits";
import Testimonial from "./components/home/Testimonial";
import CTA from "./components/home/CTA";
import FAQs from "./components/home/FAQs";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <About />
      <Features />
      <Benefits />
      <Testimonial />
      <CTA />
      <FAQs />
      <Footer />
    </>
  );
}
