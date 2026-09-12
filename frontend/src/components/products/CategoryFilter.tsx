import React from "react";
import { useTranslation } from "react-i18next";
import type { Categoria } from "../../api/productos.api";
import { nombreCategoria } from "../../utils/categoria";

interface CategoryFilterProps {
  categorias: Categoria[];
  seleccionadas: Set<number>;
  onChange: (next: Set<number>) => void;
  className?: string;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categorias,
  seleccionadas,
  onChange,
  className = "",
}) => {
  const { t, i18n } = useTranslation();

  if (categorias.length === 0) return null;

  const toggle = (id: number) => {
    const next = new Set(seleccionadas);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button
        onClick={() => onChange(new Set())}
        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
          seleccionadas.size === 0
            ? "bg-primary-container text-on-primary-fixed border-primary-container"
            : "bg-transparent text-on-surface-variant border-outline-variant/50 hover:border-primary/50"
        }`}
      >
        {t("catalog.allCategories")}
      </button>
      {categorias.map((cat) => (
        <button
          key={cat.id}
          onClick={() => toggle(cat.id)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            seleccionadas.has(cat.id)
              ? "bg-primary-container text-on-primary-fixed border-primary-container"
              : "bg-transparent text-on-surface-variant border-outline-variant/50 hover:border-primary/50"
          }`}
        >
          {nombreCategoria(cat, i18n.language)}
        </button>
      ))}
    </div>
  );
};

export function filtrarPorCategorias<T extends { categoria: number }>(
  items: T[],
  seleccionadas: Set<number>
): T[] {
  if (seleccionadas.size === 0) return items;
  return items.filter((item) => seleccionadas.has(item.categoria));
}
