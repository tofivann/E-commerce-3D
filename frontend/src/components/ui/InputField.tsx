import React from 'react';

interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: string;
  required?: boolean;
  isMono?: boolean;
  extraRightContent?: React.ReactNode;
}

export const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  icon,
  required = false,
  isMono = false,
  extraRightContent,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-semibold tracking-wider text-[#b9cacb] uppercase" htmlFor={id}>
          {label}
        </label>
        {extraRightContent}
      </div>
      <div className="relative group">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#849495] group-focus-within:text-[#dbfcff] transition-colors">
            {icon}
          </span>
        )}
        <input
          className={`w-full bg-[#333539] border border-[#3b494b] rounded-lg py-3 ${icon ? 'pl-12' : 'pl-4'} pr-4 text-[#e2e2e8] placeholder:text-[#849495] focus:border-[#00dbe9] focus:ring-1 focus:ring-[#00dbe9] transition-all outline-none shadow-inner ${isMono ? 'font-mono text-sm' : ''}`}
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
        />
      </div>
    </div>
  );
};