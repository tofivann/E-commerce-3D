import React from "react";

interface PildoraProps {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

// El botón con forma de píldora de todos los filtros y selectores de la app
// (rosa cuando está marcado). Es el ÚNICO sitio donde se define su aspecto:
// lo usan FiltroChips (elegir una opción), CategoryFilter (elegir varias
// categorías) y los selectores de categorías de ProductForm y
// CompletarComisionModal. Solo dibuja; quien lo usa decide qué significa
// marcarlo.
export const Pildora: React.FC<PildoraProps> = ({ activa, onClick, children }) => (
  <button
    // type="button": dentro de un <form> no debe enviarlo.
    type="button"
    aria-pressed={activa}
    onClick={onClick}
    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
      activa
        ? "bg-primary-container text-on-primary-fixed border-primary-container"
        : "bg-transparent text-on-surface-variant border-outline-variant/50 hover:border-primary/50"
    }`}
  >
    {children}
  </button>
);
