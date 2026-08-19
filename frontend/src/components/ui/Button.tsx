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
    primary: 'bg-primary-container text-on-primary-fixed hover:bg-primary-fixed-dim hover:shadow-[0_4px_14px_rgba(232,137,174,0.45)]',
    outline: 'bg-transparent border border-outline-variant text-on-surface hover:bg-surface-container-low'
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