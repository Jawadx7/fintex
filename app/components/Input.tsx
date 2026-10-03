type InputProps = {
  type: string;
  id: string;
  name: string;
  label?: string;
  value: string;
  setValue: (value: string) => void;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  max?: string;
};

const Input = ({
  type,
  id,
  name,
  label,
  value,
  setValue,
  error,
  required,
  autoComplete,
  max,
}: InputProps) => {
  const describedBy = error ? `${id}-error` : undefined;

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
        required={required}
        max={max}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => setValue(event.target.value)}
        className={`w-full my-2 outline-none border-2 rounded-md p-2 text-primary text-base ${
          error ? "border-red-500" : "border-black"
        }`}
      />

      {error && (
        <p id={describedBy} role="alert" className="text-[12px] text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
