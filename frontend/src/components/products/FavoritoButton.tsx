import React from "react";
import { useTranslation } from "react-i18next";

interface FavoritoButtonProps {
  activo: boolean;
  onToggle: () => void;
  className?: string;
}

// El corazón de favoritos: relleno y rosa cuando el producto está guardado.
// Único sitio donde se define; lo usan la tarjeta del catálogo y el detalle
// del producto. Solo dibuja y avisa del clic: quién guarda el favorito lo
// decide quien lo usa (useFavoritos o la página de Favoritos).
export const FavoritoButton: React.FC<FavoritoButtonProps> = ({ activo, onToggle, className = "" }) => {
  const { t } = useTranslation();
  const etiqueta = t(activo ? "favoritos.remove" : "favoritos.add");

  return (
    <button
      type="button"
      aria-pressed={activo}
      aria-label={etiqueta}
      title={etiqueta}
      onClick={(e) => {
        // Dentro de una tarjeta clicable: que no abra además el detalle.
        e.stopPropagation();
        onToggle();
      }}
      className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-surface/80 backdrop-blur-sm border border-outline-variant/50 shadow-md transition-all hover:scale-110 active:scale-95 cursor-pointer ${
        activo ? "text-primary" : "text-on-surface-variant hover:text-primary"
      } ${className}`}
    >
      <span
        className="material-symbols-outlined text-[20px]"
        style={{ fontVariationSettings: activo ? "'FILL' 1" : "'FILL' 0" }}
      >
        favorite
      </span>
    </button>
  );
};
