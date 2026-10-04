import React from "react";
import { useTranslation } from "react-i18next";
import type { Categoria } from "../../api/productos.api";
import { nombreCategoria } from "../../utils/categoria";
import { Pildora } from "../ui/Pildora";

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
      <Pildora activa={seleccionadas.size === 0} onClick={() => onChange(new Set())}>
        {t("catalog.allCategories")}
      </Pildora>
      {categorias.map((cat) => (
        <Pildora key={cat.id} activa={seleccionadas.has(cat.id)} onClick={() => toggle(cat.id)}>
          {nombreCategoria(cat, i18n.language)}
        </Pildora>
      ))}
    </div>
  );
};
