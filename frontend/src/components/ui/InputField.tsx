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
  const esPassword = type === "password";
  const [mostrarPassword, setMostrarPassword] = React.useState(false);
  const tipoReal = esPassword && mostrarPassword ? "text" : type;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase" htmlFor={id}>
          {label}
        </label>
        {extraRightContent}
      </div>
      <div className="relative group">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">
            {icon}
          </span>
        )}
        <input
          className={`w-full bg-surface-variant border border-outline-variant rounded-lg py-3 ${icon ? 'pl-12' : 'pl-4'} ${esPassword ? 'pr-12' : 'pr-4'} text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner ${isMono ? 'font-mono text-sm' : ''}`}
          id={id}
          name={id}
          type={tipoReal}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
        />
        {esPassword && (
          <button
            type="button"
            onClick={() => setMostrarPassword((v) => !v)}
            aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline hover:text-primary transition-colors"
          >
            {mostrarPassword ? "visibility_off" : "visibility"}
          </button>
        )}
      </div>
    </div>
  );
};