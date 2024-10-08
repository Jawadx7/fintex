import { faqs } from "../../../public/data/faqs";

const FAQs = () => {
  return (
    <div
      id="faqs"
      className="bg-transparent shadow-lg px-5 py-20 rounded-[1.5rem] m-2 my-10 flex-col"
    >
      <h1 className="text-5xl font-[500] text-center text-primary">FAQs</h1>
      <article className="w-full sm:w-1/2 mt-5">
        <h3 className="font-bold text-xl">
          Have questions? We've got answers.
        </h3>
      </article>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {faqs.map((item) => (
          <div key={item.id} className="my-5">
            <h1 className="font-semibold mb-2 text-gray-700">
              {item.question}
            </h1>
            <p className="text-sm text-gray-500">{item.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
export default FAQs;
