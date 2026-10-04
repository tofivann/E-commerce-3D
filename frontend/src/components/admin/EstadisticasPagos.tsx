import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FILTROS_VENTAS } from "../../api/ventas.api";
import type { FiltroVentas, Venta } from "../../api/ventas.api";
import { useResumenVentas, useVentasPaginadas } from "../../hooks/useVentas";
import { RANGO_SIN_LIMITE } from "../../utils/fechas";
import type { RangoFechas } from "../../utils/fechas";
import { formatearDinero } from "../../utils/importe";
import { TEMA_ESTADO, claveEtiquetaEstado } from "../../utils/estadoComision";
import { FiltroChips } from "../ui/FiltroChips";
import { FiltroFechas } from "../ui/FiltroFechas";
import { InfiniteScrollSentinel } from "../ui/InfiniteScrollSentinel";
import { TablaSkeleton } from "../ui/TablaSkeleton";

// Mismo patrón que las tablas de Ajustes (UserAdminTable, ProductAdminTable):
// tabla real a cualquier ancho, con cabecera, que en móvil se desplaza de
// lado dentro de su panel en vez de apilarse.
const thClass = "py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold whitespace-nowrap";
const tdClass = "py-3 px-6 text-sm align-top";

// Sección "Estadísticas y pagos" del panel admin: todas las ventas (compras
// de la tienda y comisiones), filtrables por tipo/estado y por fecha, con el
// total cobrado de cada filtro. Solo consulta — las comisiones se trabajan
// en ComisionesAdmin. Qué cuenta como venta lo decide el backend
// (orders/ventas.py); aquí solo se muestra.
export const EstadisticasPagos: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [filtro, setFiltro] = useState<FiltroVentas>("todas");
  const [rango, setRango] = useState<RangoFechas>(RANGO_SIN_LIMITE);

  const { resumen, error: errorResumen } = useResumenVentas(rango);
  const ventas = useVentasPaginadas(filtro, rango);

  const opciones = FILTROS_VENTAS.map((clave) => ({
    valor: clave,
    etiqueta: t(`estadisticas.filters.${clave}`),
    destacado: resumen ? formatearDinero(resumen[clave].total, i18n.language) : "—",
    cargando: !resumen && !errorResumen,
    nota: resumen ? t("estadisticas.salesCount", { count: resumen[clave].cantidad }) : undefined,
  }));

  const fecha = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" });

  const conceptos = (venta: Venta) =>
    venta.conceptos.map((concepto) => concepto ?? t("estadisticas.deletedProduct")).join(", ");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-on-surface mb-1">{t("estadisticas.title")}</h1>
        <p className="text-on-surface-variant">{t("estadisticas.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-5 mb-6">
        <FiltroFechas rango={rango} onChange={setRango} />
        <FiltroChips opciones={opciones} seleccionado={filtro} onChange={setFiltro} titulo={t("estadisticas.filtersTitle")} />
        {errorResumen && <p className="text-error text-sm">{t("estadisticas.summaryError")}</p>}
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high/60 border-b border-outline-variant/30">
                <th className={thClass}>{t("estadisticas.colDate")}</th>
                <th className={thClass}>{t("estadisticas.colOrder")}</th>
                <th className={thClass}>{t("estadisticas.colClient")}</th>
                <th className={thClass}>{t("estadisticas.colConcept")}</th>
                <th className={thClass}>{t("estadisticas.colGateway")}</th>
                <th className={`${thClass} text-right`}>{t("estadisticas.colCollected")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {ventas.items.map((venta) => (
                <tr key={venta.id} className="hover:bg-surface-container-highest/30 transition-colors">
                  <td className={`${tdClass} text-on-surface-variant whitespace-nowrap`}>{fecha(venta.fecha_orden)}</td>
                  <td className={`${tdClass} font-mono text-xs text-on-surface-variant whitespace-nowrap`}>
                    {venta.codigo_orden}
                  </td>
                  <td className={tdClass}>
                    <div className="text-on-surface font-medium whitespace-nowrap">{venta.cliente_nombre}</div>
                    <div className="text-on-surface-variant text-xs font-mono">{venta.cliente_email}</div>
                  </td>
                  {/* min-w: que en móvil el texto no se parta palabra por palabra */}
                  <td className={`${tdClass} min-w-56`}>
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-on-surface-variant whitespace-nowrap">
                        {t(`estadisticas.type.${venta.tipo_orden}`)}
                      </span>
                      {venta.estado_comision && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${TEMA_ESTADO[venta.estado_comision].badgeBg} ${TEMA_ESTADO[venta.estado_comision].badgeText}`}
                        >
                          {t(claveEtiquetaEstado(venta.estado_comision))}
                        </span>
                      )}
                    </div>
                    <div className="text-on-surface">{conceptos(venta)}</div>
                  </td>
                  <td className={`${tdClass} text-on-surface-variant`}>{venta.pasarela_pago}</td>
                  <td className={`${tdClass} font-mono font-bold text-on-surface text-right whitespace-nowrap`}>
                    {formatearDinero(venta.total, i18n.language)}
                  </td>
                </tr>
              ))}

              {/* Carga inicial: una tanda de filas; al pedir más páginas, un par al final. */}
              {ventas.cargando && <TablaSkeleton columnas={6} />}
              {ventas.cargandoMas && <TablaSkeleton filas={4} columnas={6} />}
              {ventas.error && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-error">
                    {t("estadisticas.listError")}
                  </td>
                </tr>
              )}
              {!ventas.cargando && !ventas.error && ventas.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                    {t("estadisticas.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InfiniteScrollSentinel onVisible={ventas.cargarMas} disabled={!ventas.hayMas || ventas.cargandoMas} />
    </div>
  );
};
