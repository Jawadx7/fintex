"use client";

import SectionTag from "../SectionTag";
import { Badge, CheckCircle } from "lucide-react";

const Features = () => {
  const features = [
    {
      id: 1,
      icon: "Img",
      heading: "Fast",
      text: "Automatically process transfers in real-time to maximize throughput efficiency",
    },
    {
      id: 2,
      icon: "Img",
      heading: "Instant",
      text: "Fully automate the payment lifecycle without the need to custom coding",
    },
    {
      id: 3,
      icon: "Img",
      heading: "Secure",
      text: "Eliminate concerns over risks such as insufficient funds and transaction failures",
    },
    {
      id: 4,
      icon: "Img",
      heading: "Build for Scale",
      text: "Drive down costs, scale transactions and wield payments as a strength",
    },
  ];
  return (
    <section id="fitures">
      <div className="ml-[10%] sm:ml-1">
        <SectionTag text="Features" center={true} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 align-center">
        <h1 className="mt-[3rem] text-[2rem] sm:text-[3rem]">
          Finally, a better way to simplify payments
        </h1>
        <p className="lg:text-xl sm:text-3xl text-gray-600">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Deleniti in
          adipisci.
        </p>
      </div>

      <div className="w-full md:mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mt-[2rem] gap-3">
        {features.map((featureItem) => (
          <div
            key={featureItem.id}
            className="rounded-[1rem] p-[1rem] shadow-md hover:bg-brown_light"
          >
            <div className="mb-[3rem]">
              <Badge size={60} />
            </div>

            <h1 className="h3 text-[1.2rem]">{featureItem.heading}</h1>
            <p className="mb-[2rem] mt-[1rem]">{featureItem.text}</p>
            <div>
              <CheckCircle size={40} />
            </div>
          </div>
        ))}

        {/* <div className="rounded-[1rem] p-[1rem] shadow-md hover:bg-brown_light">
          <div className="mb-[3rem]">
            <Badge size={60} />
          </div>

          <h1 className="h3 text-[1.2rem]">Benefit One</h1>
          <p className="mb-[2rem] mt-[1rem]">
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Blanditiis
            ipsum ducimus dignissimos accusantium illum ad vero? Ipsum esse
            exercitationem.
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
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Blanditiis
            ipsum ducimus dignissimos accusantium illum ad vero? Ipsum esse
            exercitationem.
          </p>
          <div>
            <CheckCircle size={40} />
          </div>
        </div> */}
      </div>
    </section>
  );
};
export default Features;
