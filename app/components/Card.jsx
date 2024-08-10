import React from "react";
import "../styles/dashboard.scss";

const Card = ({ bg, color, name, number, provider, date }) => {
  return (
    <div className={`card text-white rounded-md p-3 my-2`}>
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
