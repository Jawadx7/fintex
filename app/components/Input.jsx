const Input = ({ type, id, name, label, value, setValue }) => {
  return (
    <div>
      {label && (
        <div>
          <label className="text-[13px] font-semibold" htmlFor={id}>
            {label}
          </label>
          <br />
        </div>
      )}

      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full my-2 outline-none border-2 borer-black rounded-md p-2 text-primary text-base"
      />
    </div>
  );
};
export default Input;
