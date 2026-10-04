import { useState } from "react";
import { useTranslation } from "react-i18next";
import { evaluarMonto, formatearImporte } from "../utils/importe";

// Estado y reglas del "monto a pagar" de una comisión, compartido por
// ComisionMotionForm y ComisionModeloForm. `minimo` es el precio del
// tramo/juego elegido (null mientras no se haya elegido ninguno).
//
// El formulario llama a `fijarAlMinimo(precio)` al elegir tramo/juego (en el
// propio onClick, no en un efecto) para que el campo arranque en el mínimo.
export function useMontoComision(minimo: number | null) {
  const { t } = useTranslation();
  const [monto, setMonto] = useState("");

  const estado = minimo === null ? null : evaluarMonto(monto, minimo);
  const error =
    estado === "formato"
      ? t("comisiones.amountInvalid")
      : estado === "menorAlMinimo"
      ? t("comisiones.amountBelowMin", { min: formatearImporte(minimo as number) })
      : null;

  // Pagar de más es voluntario, así que antes de ir a la pasarela se pide
  // una confirmación — solo cuando el monto supera el mínimo.
  const confirmar = (): boolean => {
    if (minimo === null || Number(monto) <= minimo) return true;
    return window.confirm(
      t("comisiones.amountConfirm", { monto: formatearImporte(monto), min: formatearImporte(minimo) })
    );
  };

  return {
    monto: monto.trim(),
    setMonto,
    fijarAlMinimo: (precio: number | string) => setMonto(formatearImporte(precio)),
    valido: estado === "ok",
    error,
    confirmar,
  };
}
