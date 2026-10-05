import React from "react";
import { useTranslation } from "react-i18next";
import { monedasApi } from "../../api/monedas.api";
import type { MovimientoMonedas, TipoMovimientoMonedas } from "../../api/monedas.api";
import { useListaPaginada } from "../../hooks/useListaPaginada";
import { Monedas } from "../ui/Monedas";

interface HistorialMonedasProps {
  saldo: number;
}

// Texto de cada movimiento según por qué se produjo.
const CLAVE_TIPO: Record<TipoMovimientoMonedas, string> = {
  GANADA: "monedas.tipoGanada",
  PAGO: "monedas.tipoPago",
  DEVOLUCION: "monedas.tipoDevolucion",
  RETIRO: "monedas.tipoRetiro",
  AJUSTE: "monedas.tipoAjuste",
};

const idDeMovimiento = (movimiento: MovimientoMonedas) => movimiento.id;

// Sección "Mis monedas" del perfil: el saldo y, debajo, cada moneda ganada o
// gastada con su motivo. La lista se vuelve a pedir sola cuando cambia el
// saldo (es la `clave` de la consulta): si cambió, hay un movimiento nuevo.
export const HistorialMonedas: React.FC<HistorialMonedasProps> = ({ saldo }) => {
  const { t, i18n } = useTranslation();
  const { items, cargando, cargandoMas, error, hayMas, cargarMas } = useListaPaginada<MovimientoMonedas>({
    clave: `saldo-${saldo}`,
    cargarPagina: monedasApi.listarMovimientos,
    obtenerId: idDeMovimiento,
  });

  return (
    <section className="border-t border-outline-variant/30 pt-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">{t("monedas.titulo")}</h2>
          <p className="text-on-surface-variant text-sm mt-1">{t("monedas.explicacion")}</p>
        </div>
        <Monedas cantidad={saldo} formato="largo" className="text-xl text-primary" />
      </div>

      {error && <p className="text-error text-sm">{t("monedas.historialError")}</p>}
      {cargando && <div className="h-24 rounded-lg bg-surface-container-highest animate-pulse opacity-20" aria-hidden="true" />}
      {!cargando && !error && items.length === 0 && (
        <p className="text-on-surface-variant text-sm">{t("monedas.historialVacio")}</p>
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-outline-variant/20 rounded-lg border border-outline-variant/30">
          {items.map((movimiento) => (
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
      )}

      {hayMas && (
        <button
          type="button"
          onClick={cargarMas}
          disabled={cargandoMas}
          className="self-start border border-outline-variant/60 text-primary rounded-lg py-2 px-4 text-sm font-semibold hover:border-primary/60 hover:bg-primary/10 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {cargandoMas ? t("monedas.historialCargando") : t("monedas.historialVerMas")}
        </button>
      )}
    </section>
  );
};
