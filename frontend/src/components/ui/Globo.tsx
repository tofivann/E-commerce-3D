import React from "react";

interface GloboProps {
  cantidad: number;
  // Texto para lectores de pantalla (p. ej. "3 mensajes sin leer").
  etiqueta: string;
  className?: string;
}

// Globo rojo con un número, para colgarlo de un enlace del menú (el padre
// lleva `relative`). No se dibuja si la cantidad es 0; por encima de 99
// muestra "99+".
export const Globo: React.FC<GloboProps> = ({ cantidad, etiqueta, className = "" }) => {
  if (cantidad <= 0) return null;
  return (
    <span
      role="status"
      aria-label={etiqueta}
      className={`inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-error px-1.5 text-[11px] font-bold leading-none text-on-error shadow-[0_1px_4px_#00000033] ${className}`}
    >
      {cantidad > 99 ? "99+" : cantidad}
    </span>
  );
};
