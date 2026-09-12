import React from "react";
import { useTranslation } from "react-i18next";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder,
  className = "",
}) => {
  const { t } = useTranslation();

  return (
    <div className={`relative ${className}`}>
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
        search
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("common.search")}
        className="w-full bg-surface-variant border border-outline-variant rounded-full pl-10 pr-4 py-2.5 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
      />
    </div>
  );
};
