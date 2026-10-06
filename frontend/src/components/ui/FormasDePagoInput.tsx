import React from "react";
import { useTranslation } from "react-i18next";
import { Pildora } from "./Pildora";

export interface FormasDePago {
  aceptaDinero: boolean;
  aceptaMonedas: boolean;
}

interface FormasDePagoInputProps {
  valor: FormasDePago;
  onChange: (valor: FormasDePago) => void;
  // Error del servidor para este campo, si lo hay.
  error?: string;
}

// "Se paga con": una casilla por forma de pago, en cualquier combinación (al
// menos una). Lo usan el formulario de producto y el modal de entrega de
// comisiones; una forma de pago nueva es una píldora más aquí.
export const FormasDePagoInput: React.FC<FormasDePagoInputProps> = ({ valor, onChange, error }) => {
  const { t } = useTranslation();
  const ninguna = !valor.aceptaDinero && !valor.aceptaMonedas;
  const mensaje = error ?? (ninguna ? t("monedas.formasPagoNinguna") : null);

  return (
    <div>
      <span className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
        {t("monedas.formasPagoLabel")}
      </span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("monedas.formasPagoLabel")}>
        <Pildora activa={valor.aceptaDinero} onClick={() => onChange({ ...valor, aceptaDinero: !valor.aceptaDinero })}>
          {t("monedas.formaDinero")}
        </Pildora>
        <Pildora activa={valor.aceptaMonedas} onClick={() => onChange({ ...valor, aceptaMonedas: !valor.aceptaMonedas })}>
          {t("monedas.formaMimiCoins")}
        </Pildora>
      </div>
      <p className={`text-xs mt-1 ${mensaje ? "text-error" : "text-on-surface-variant"}`}>
        {mensaje ?? t("monedas.formasPagoAyuda")}
      </p>
    </div>
  );
};
