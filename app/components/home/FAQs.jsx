import { faqs } from "../../../public/data/faqs";

const FAQs = () => {
  return (
    <div
      id="faqs"
      className="bg-transparent shadow-lg px-5 py-20 rounded-[1.5rem] m-2 my-10 flex-col"
    >
      <h1 className="text-5xl font-[500] text-center text-primary">FAQs</h1>
      <article className="w-full sm:w-1/2 mt-5">
        <h3 className="font-bold text-xl">Frequently Asked Questions</h3>
        <p className="text-[1rem] md:text-sm">
          Lorem, ipsum dolor sit amet consectetur adipisicing elit. Blanditiis
          quo repellendus inventore at. Rem consequuntur nostrum architecto
          error! Suscipit, libero.
        </p>
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
