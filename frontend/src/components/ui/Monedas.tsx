import React from "react";
import { useTranslation } from "react-i18next";
import mimicoin from "../../assets/mimicoin.webp";

interface MonedasProps {
  cantidad: number;
  // "corto": icono + número (tarjetas, cabecera). "largo": "10 monedas".
  formato?: "corto" | "largo";
  className?: string;
}

// El icono del MimiCoin, el mismo en todo el sitio: la moneda dorada con la
// conejita (assets/mimicoin.webp, 128 px, recortada de la ilustración que
// entregó el dueño). Para cambiar la moneda se reemplaza ese archivo, nada más.
// Mide en `em`: sigue el tamaño de letra de donde se ponga (o el que le dé
// `className`, p. ej. "text-[20px]").
export const IconoMoneda: React.FC<{ className?: string }> = ({ className = "" }) => (
  <img
    src={mimicoin}
    alt=""
    aria-hidden="true"
    draggable={false}
    className={`inline-block w-[1.25em] h-[1.25em] shrink-0 rounded-full object-cover ${className}`}
  />
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
