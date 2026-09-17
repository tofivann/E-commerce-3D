import React from "react";
import { useTranslation } from "react-i18next";
import type { Categoria } from "../../api/productos.api";
import { nombreCategoria } from "../../utils/categoria";

interface CategoryBadgeProps {
  categorias?: Categoria[] | null;
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ categorias, className = "" }) => {
  const { i18n } = useTranslation();

  if (!categorias || categorias.length === 0) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 self-start flex-wrap text-[10px] font-semibold uppercase tracking-wide text-primary-fixed-dim ${className}`}
    >
      <span className="material-symbols-outlined text-[12px]">sell</span>
      {categorias.map((categoria) => nombreCategoria(categoria, i18n.language)).join(", ")}
    </span>
  );
};
