"use client";

const SectionTag = ({ text, center }) => {
  return (
    <div
      className={` ${center ? "mx-auto" : ""} tag h3 text-[1.5rem] uppercase`}
    >
      {text}
    </div>
  );
};

export default SectionTag;
