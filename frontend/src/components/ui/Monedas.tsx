import React from "react";
import { useTranslation } from "react-i18next";

interface MonedasProps {
  cantidad: number;
  // "corto": icono + número (tarjetas, cabecera). "largo": "10 monedas".
  formato?: "corto" | "largo";
  className?: string;
}

// El icono de la moneda, el mismo en todo el sitio: una estrella dentro de
// un círculo (sin símbolo de dólar: las monedas no son dinero).
export const IconoMoneda: React.FC<{ className?: string }> = ({ className = "" }) => (
  <span className={`material-symbols-outlined ${className}`} style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
    stars
  </span>
);

// Una cantidad de monedas, siempre con el mismo icono. El único sitio donde
// se dibuja: precios en monedas, saldo de la cabecera, historial, etc.
export const Monedas: React.FC<MonedasProps> = ({ cantidad, formato = "corto", className = "" }) => {
  const { t } = useTranslation();
  const texto = t("monedas.cantidad", { count: cantidad });

  return (
    <span className={`inline-flex items-center gap-1 font-mono font-bold whitespace-nowrap ${className}`} title={texto}>
      <IconoMoneda className="text-[1.15em]" />
      {formato === "largo" ? texto : <span aria-label={texto}>{cantidad}</span>}
    </span>
  );
};
