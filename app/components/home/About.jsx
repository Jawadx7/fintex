import Img from "../../../public/images/figure-1.png";

import Image from "next/image";
import Socials from "../Socials";

const About = () => {
  return (
    <section className="flex md:flex-row flex-col-reverse align-center space-x-5">
      <div className="flex-[1] flex align-center justify-center">
        <Image src={Img} alt="Image" />
      </div>
      <div className="flex-[1]">
        <h1 className="mt-[3rem] text-[2rem] sm:text-[3rem]">
          About The Company
        </h1>

        <p className="mb-[1rem]">
          We are a fintech company dedicated to transforming the way people
          interact with thier money. Our mission is to simplify personal
          finance, making it accesible, transparent, and secure for everyone.
        </p>
        <p className="mb-3">
          Through cuting-adge technology and user-centric approach, we strive to
          deliver a financial experience that is seamless, efficient, and
          empowering. Our team is passionate about reshaping the financial
          landscape, ensuring that every user can make informed and impactful
          financial decisions with ease.
        </p>
        <p className="mb-3">
          At the heart of out service is a commitment to innovation and a vision
          for a financial empowered future.
        </p>

        <Socials />
      </div>
    </section>
  );
};
export default About;
