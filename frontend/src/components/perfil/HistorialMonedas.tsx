import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { monedasApi } from "../../api/monedas.api";
import type { MovimientoMonedas } from "../../api/monedas.api";
import { useListaPaginada } from "../../hooks/useListaPaginada";
import { ListaMovimientos } from "../monedas/ListaMovimientos";
import { Monedas } from "../ui/Monedas";

interface HistorialMonedasProps {
  saldo: number;
}

// Cuántos movimientos se muestran en el perfil; el resto, en /mimicoins.
const ULTIMOS = 5;

const idDeMovimiento = (movimiento: MovimientoMonedas) => movimiento.id;
// Fuera del componente: useListaPaginada vuelve a pedir la lista cada vez
// que cambia esta función, así que tiene que ser siempre la misma.
const cargarUltimos = (page: number) => monedasApi.listarMovimientos(page, ULTIMOS);

// Sección "Mis MimiCoins" del perfil: el saldo y solo los últimos
// movimientos, con un enlace al historial completo (MimiCoinsPage). Con el
// tiempo un usuario acumula muchos y una lista larga aquí tapaba el resto
// del perfil. La lista se vuelve a pedir sola cuando cambia el saldo (es la
// `clave` de la consulta): si cambió, hay un movimiento nuevo.
export const HistorialMonedas: React.FC<HistorialMonedasProps> = ({ saldo }) => {
  const { t } = useTranslation();
  const { items, total, cargando, error } = useListaPaginada<MovimientoMonedas>({
    clave: `resumen-${saldo}`,
    cargarPagina: cargarUltimos,
    obtenerId: idDeMovimiento,
  });
  const hayMas = (total ?? 0) > ULTIMOS;

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
        <>
          <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase -mb-2">{t("monedas.ultimosMovimientos")}</p>
          <ListaMovimientos movimientos={items.slice(0, ULTIMOS)} />
        </>
      )}

      <Link
        to="/mimicoins"
        className="self-start inline-flex items-center gap-2 no-underline border border-outline-variant/60 text-primary rounded-lg py-2 px-4 text-sm font-semibold hover:border-primary/60 hover:bg-primary/10 transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">history</span>
        {hayMas ? t("monedas.verHistorialCompleto", { count: total ?? 0 }) : t("monedas.verHistorial")}
      </Link>
    </section>
  );
};
