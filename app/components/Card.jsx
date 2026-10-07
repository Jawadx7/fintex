import Image from "next/image";

import banner from "../../public/images/banner.jpeg";

const Card = ({ name, number, provider, date }) => {
  return (
    <div className="relative overflow-hidden rounded-md p-3 my-2 text-white">
      {/* Replaces the .card background-image rule from dashboard.scss */}
      <Image
        src={banner}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, 33vw"
        className="object-cover object-center -z-10"
        aria-hidden="true"
      />
      <div className="flex align-center justify-between">
        <span>CODE</span>
        <span>{provider}</span>
      </div>

      <div className="my-3">
        <span>{number}</span> <br />
        <span>{date}</span>
      </div>

      <div className="flex justify-end">{name}</div>
    </div>
  );
};

export default Card;