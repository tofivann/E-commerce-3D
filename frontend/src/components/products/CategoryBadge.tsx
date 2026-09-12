import React from "react";
import { useTranslation } from "react-i18next";
import type { Categoria } from "../../api/productos.api";
import { nombreCategoria } from "../../utils/categoria";

interface CategoryBadgeProps {
  categoria?: Categoria | null;
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ categoria, className = "" }) => {
  const { i18n } = useTranslation();

  if (!categoria) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 self-start text-[10px] font-semibold uppercase tracking-wide text-primary-fixed-dim ${className}`}
    >
      <span className="material-symbols-outlined text-[12px]">sell</span>
      {nombreCategoria(categoria, i18n.language)}
    </span>
  );
};
