import React from "react";

// Define the types for the props
interface InputFieldProps {
  label: string;
  value: string | number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; // Default to text if no type is provided
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  type = "text",
}) => {
  return (
    <div className="my-4 flex justify-between">
      <label
        htmlFor={label}
        className="block text-lg font-semibold text-gray-400 my-auto mr-3"
      >
        {label}
      </label>
      <input
        id={label}
        type={type}
        value={value}
        onChange={onChange}
        className="px-4 py-2 border border-gray-300 bg-gray-400 rounded-md focus:outline-none focus:ring-2 focus:bg-blue-300"
      />
    </div>
  );
};

export default InputField;
