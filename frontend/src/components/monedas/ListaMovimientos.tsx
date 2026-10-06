import React from "react";
import { useTranslation } from "react-i18next";
import type { MovimientoMonedas, TipoMovimientoMonedas } from "../../api/monedas.api";

// Texto de cada movimiento según por qué se produjo.
const CLAVE_TIPO: Record<TipoMovimientoMonedas, string> = {
  GANADA: "monedas.tipoGanada",
  PAGO: "monedas.tipoPago",
  DEVOLUCION: "monedas.tipoDevolucion",
  RETIRO: "monedas.tipoRetiro",
  AJUSTE: "monedas.tipoAjuste",
};

// La lista de movimientos de MimiCoins, tal cual: una fila por movimiento
// con su motivo, fecha, orden y cantidad. No sabe de dónde vienen los
// movimientos: la usan el resumen del perfil (los últimos) y la página del
// historial completo (todos, por páginas).
export const ListaMovimientos: React.FC<{ movimientos: MovimientoMonedas[] }> = ({ movimientos }) => {
  const { t, i18n } = useTranslation();

  return (
    <ul className="divide-y divide-outline-variant/20 rounded-lg border border-outline-variant/30">
      {movimientos.map((movimiento) => (
        <li key={movimiento.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm text-on-surface">{t(CLAVE_TIPO[movimiento.tipo])}</p>
            <p className="text-xs text-on-surface-variant break-words">
              {new Date(movimiento.fecha).toLocaleDateString(i18n.language, { year: "numeric", month: "short", day: "numeric" })}
              {movimiento.codigo_orden && <span className="font-mono"> · {movimiento.codigo_orden}</span>}
              {movimiento.nota && <span> · {movimiento.nota}</span>}
            </p>
          </div>
          <span className={`font-mono font-bold whitespace-nowrap ${movimiento.cantidad > 0 ? "text-primary" : "text-on-surface-variant"}`}>
            {movimiento.cantidad > 0 ? "+" : "−"}
            {Math.abs(movimiento.cantidad)}
          </span>
        </li>
      ))}
    </ul>
  );
};
