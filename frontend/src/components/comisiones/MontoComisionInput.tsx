import React from "react";
import { useTranslation } from "react-i18next";
import { formatearImporte } from "../../utils/importe";

interface Props {
  monto: string;
  // Precio del tramo/juego elegido; null = todavía no se eligió ninguno.
  minimo: number | null;
  error: string | null;
  onChange: (valor: string) => void;
}

// Campo "Monto a pagar" de los formularios de comisión: arranca en el precio
// mínimo y el cliente puede subirlo. Las reglas viven en useMontoComision.
export const MontoComisionInput: React.FC<Props> = ({ monto, minimo, error, onChange }) => {
  const { t } = useTranslation();
  const sinElegir = minimo === null;

  return (
    <div>
      <label
        htmlFor="montoComision"
        className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2"
      >
        {t("comisiones.amountLabel")}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono">$</span>
        <input
          id="montoComision"
          type="text"
          inputMode="decimal"
          disabled={sinElegir}
          placeholder="0.00"
          className={`w-full bg-surface-variant border rounded-lg py-3 pl-8 pr-4 text-on-surface font-mono placeholder:text-outline focus:ring-1 transition-all outline-none shadow-inner disabled:opacity-50 ${
            error ? "border-error focus:border-error focus:ring-error" : "border-outline-variant focus:border-primary focus:ring-primary"
          }`}
          value={monto}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {error ? (
        <p className="text-error text-xs mt-1">{error}</p>
      ) : (
        <p className="text-on-surface-variant text-xs mt-1">
          {sinElegir ? t("comisiones.amountPickFirst") : t("comisiones.amountHelp", { min: formatearImporte(minimo) })}
        </p>
      )}
    </div>
  );
};
