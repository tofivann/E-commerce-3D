import React from "react";
import { useTranslation } from "react-i18next";
import { precioMonedasValido } from "../../utils/monedas";
import { IconoMoneda } from "./Monedas";

interface PrecioMonedasInputProps {
  id: string;
  valor: string;
  onChange: (valor: string) => void;
  // Error del servidor para este campo, si lo hay.
  error?: string;
}

// Campo "Precio en monedas" de los formularios del admin (producto y datos
// de reventa de una comisión). Vacío = no se puede pagar con monedas.
// type="text" + inputMode: teclado numérico, sin que el navegador descarte
// en silencio lo que no entiende (mismo criterio que el precio en dólares).
export const PrecioMonedasInput: React.FC<PrecioMonedasInputProps> = ({ id, valor, onChange, error }) => {
  const { t } = useTranslation();
  const mensaje = error ?? (precioMonedasValido(valor) ? null : t("monedas.precioInvalido"));

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
        {t("monedas.precioLabel")}
      </label>
      <div className="relative">
        <IconoMoneda className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
        <input
          id={id}
          type="text"
          inputMode="numeric"
          className={`w-full bg-surface-variant border rounded-lg py-3 pl-10 pr-4 text-on-surface placeholder:text-outline focus:ring-1 transition-all outline-none shadow-inner ${
            mensaje ? "border-error focus:border-error focus:ring-error" : "border-outline-variant focus:border-primary focus:ring-primary"
          }`}
          placeholder={t("monedas.precioPlaceholder")}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(mensaje)}
        />
      </div>
      <p className={`text-xs mt-1 ${mensaje ? "text-error" : "text-on-surface-variant"}`}>
        {mensaje ?? t("monedas.precioAyuda")}
      </p>
    </div>
  );
};
