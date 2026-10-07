"use client";

import TestimonyCard from "./TestimonyCard";
import { testimonials } from "../../../public/data/testimonials";

import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";

import { Reveal } from "../motion/Reveal";

const Testimonial = () => {
  const responsive = {
    superLargeDesktop: {
      breakpoint: { max: 4000, min: 3000 },
      items: 2,
    },
    desktop: {
      breakpoint: { max: 3000, min: 1024 },
      items: 2,
    },
    tablet: {
      breakpoint: { max: 1024, min: 464 },
      items: 2,
    },
    mobile: {
      breakpoint: { max: 464, min: 0 },
      items: 1,
    },
  };
  return (
    <div
      id="testimonial"
      className="flex w-full min-w-0 flex-col lg:flex-row align-center bg-primary text-white px-[5%] py-[5rem] my-[3rem]"
    >
      <Reveal className="min-w-0 flex-[1] px-3">
        <h1 className="mb-5 text-4xl">Real Stories From Enterprenuers</h1>
        <p className="lg:text-base text-xl">
          Discover inspiring journeys from entrepreneurs who have transformed
          their dreams into reality. These stories showcase the impact of
          innovative financial solutions.
        </p>
      </Reveal>
      <div className="w-full min-w-0 flex-[3] overflow-hidden">
        <Carousel
          swipeable={true}
          draggable={true}
          showDots={false}
          responsive={responsive}
          className="mt-5 w-full min-w-0 lg:mt-0"
        >
          {testimonials.map((testimonyItem) => (
            <TestimonyCard key={testimonyItem.id} testimonyItem={testimonyItem} />
          ))}
        </Carousel>
      </div>
    </div>
  );
};
export default Testimonial;