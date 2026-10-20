import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { monedasApi } from "../api/monedas.api";
import type { MovimientoMonedas } from "../api/monedas.api";
import { Bandeja } from "../components/layout/Bandeja";
import { HojaSeccion } from "../components/layout/HojaSeccion";
import { ListaMovimientos } from "../components/monedas/ListaMovimientos";
import { InfiniteScrollSentinel } from "../components/ui/InfiniteScrollSentinel";
import { IconoMoneda, Monedas } from "../components/ui/Monedas";
import { TablaSkeleton } from "../components/ui/TablaSkeleton";
import { useListaPaginada } from "../hooks/useListaPaginada";
import { usePerfil } from "../hooks/usePerfil";

const idDeMovimiento = (movimiento: MovimientoMonedas) => movimiento.id;

// "Mis MimiCoins": el saldo y el historial completo de movimientos, por
// páginas con scroll infinito. Aquí llega el saldo de la cabecera y el
// enlace "Ver historial completo" del perfil. Disponible para cualquier
// cuenta con sesión, como el perfil. El menú y la barra los pone AppLayout.
export const MimiCoinsPage: React.FC = () => {
  const { t } = useTranslation();
  const { perfil } = usePerfil();
  const saldo = perfil?.saldo_monedas ?? 0;
  const lista = useListaPaginada<MovimientoMonedas>({
    // Cambia con el saldo: si cambió, hay un movimiento nuevo que mostrar.
    clave: `historial-${saldo}`,
    cargarPagina: monedasApi.listarMovimientos,
    obtenerId: idDeMovimiento,
  });

  return (
    <>
      <HojaSeccion
        titulo={
          <span className="flex items-center gap-3">
            <IconoMoneda className="text-[0.9em]" />
            {t("monedas.titulo")}
          </span>
        }
        subtitulo={t("monedas.explicacion")}
      >
        {perfil && <Monedas cantidad={saldo} formato="largo" className="mt-5 text-2xl text-vino" />}
      </HojaSeccion>

      <Bandeja className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-on-surface">{t("monedas.historialTitulo")}</h2>
            {lista.total !== null && (
              <span className="text-on-surface-variant text-sm">{t("monedas.historialTotal", { count: lista.total })}</span>
            )}
          </div>

          {lista.error && <p className="text-error text-sm">{t("monedas.historialError")}</p>}
          {lista.cargando && (
            <table className="w-full">
              <tbody>
                <TablaSkeleton columnas={2} filas={6} />
              </tbody>
            </table>
          )}
          {!lista.cargando && !lista.error && lista.items.length === 0 && (
            <div className="py-10 text-center flex flex-col items-center gap-3">
              <p className="text-on-surface-variant">{t("monedas.historialVacio")}</p>
              <Link to="/" className="text-primary font-semibold hover:underline no-underline">
                {t("monedas.historialVacioCta")}
              </Link>
            </div>
          )}
          {lista.items.length > 0 && <ListaMovimientos movimientos={lista.items} />}

          {lista.cargandoMas && <p className="text-on-surface-variant text-sm text-center">{t("monedas.historialCargando")}</p>}
          <InfiniteScrollSentinel onVisible={lista.cargarMas} disabled={!lista.hayMas || lista.cargando || lista.cargandoMas} />
        </div>
      </Bandeja>
    </>
  );
};
