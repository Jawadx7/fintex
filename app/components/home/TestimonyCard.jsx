import Image from "next/image";

const TestimonyCard = ({ testimonyItem }) => {
  return (
    <div className="bg-white p-5 rounded-[1.5rem] text-primary mx-1">
      {/* top */}
      <div className="py-3 flex align-center justify-between">
        <div className="flex align-center space-x-3">
          <Image
            src={testimonyItem.image}
            alt="user-image"
            width={50}
            className="rounded-full"
          />
          <div>
            <h3 className="text-sm font-semibold">{testimonyItem.name}</h3>
            <small className="text-[12px] text-gray-500">
              {testimonyItem.position}
            </small>
          </div>
        </div>
        <small className="border-2 border-dotted border-gray-400 p-2 rounded-[2rem]">
          {testimonyItem.company}
        </small>
      </div>

      {/* content */}
      <div className="my-2 py-5 border-y-2 border-dotted border-gray-400 text-black font-semibold">
        {testimonyItem.comment}
      </div>

      {/* bottt]om */}
      <div className="py-3 flex align-center justify-between">
        <small>logo</small>
        <small className="text-gray-500">{testimonyItem.date}</small>
      </div>
    </div>
  );
};
export default TestimonyCard;
