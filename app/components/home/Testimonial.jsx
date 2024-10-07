"use client";

import TestimonyCard from "./TestimonyCard";

import { testimonials } from "../../../public/data/testimonials";

import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";

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
      className="flex-col lg:flex-row lg:flex align-center bg-primary text-white px-[5%] py-[3rem] my-[3rem]"
    >
      <div className="flex-[1] px-3">
        {/* <h1 className="h3 text-xl md:text-4xl">Real Stories</h1> */}
        <h1 className="mb-5 text-4xl">Real Stories From Enterprenuers</h1>
        <p className="lg:text-base text-xl">
          Lorem, ipsum dolor sit amet consectetur adipisicing elit. Unde
          corporis officia.
        </p>
      </div>
      <Carousel
        swipeable={true}
        draggable={true}
        showDots={false}
        responsive={responsive}
        className="flex-[3] mt-5 lg:mt-0"
      >
        {testimonials.map((testimonyItem) => (
          <TestimonyCard key={testimonyItem.id} testimonyItem={testimonyItem} />
        ))}
      </Carousel>
    </div>
  );
};
export default Testimonial;
