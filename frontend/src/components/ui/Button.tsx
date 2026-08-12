import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
  loading?: boolean;
  icon?: string;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'w-full py-3 rounded-lg font-semibold transition-all flex justify-center items-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-[#00f0ff] text-[#00363a] hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]',
    outline: 'bg-transparent border border-[#3b494b] text-[#e2e2e8] hover:bg-[#333539]'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Processing...' : children}
      {icon && !loading && <span className="material-symbols-outlined text-[20px]">{icon}</span>}
    </button>
  );
};