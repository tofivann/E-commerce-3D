import React from "react";
import { useTranslation } from "react-i18next";
import { novedadesApi } from "../../api/novedades.api";
import type { Publicacion } from "../../api/novedades.api";
import { useListaPaginada } from "../../hooks/useListaPaginada";
import { InfiniteScrollSentinel } from "../ui/InfiniteScrollSentinel";
import { PublicacionCard } from "./PublicacionCard";

interface ListaPublicacionesProps {
  hasAccess: boolean;
  isLoggedIn: boolean;
  onLoginClick?: () => void;
}

const idDePublicacion = (publicacion: Publicacion) => publicacion.id;
// Fuera del componente: tiene que ser siempre la misma función (ver useListaPaginada).
const cargarPublicadas = (page: number) => novedadesApi.listar(page);

// Las novedades publicadas, de la más nueva a la más antigua, con scroll infinito.
export const ListaPublicaciones: React.FC<ListaPublicacionesProps> = ({ hasAccess, isLoggedIn, onLoginClick }) => {
  const { t } = useTranslation();
  const lista = useListaPaginada<Publicacion>({ clave: "publicadas", cargarPagina: cargarPublicadas, obtenerId: idDePublicacion });

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {lista.error && <p className="text-error text-sm">{t("novedades.loadError")}</p>}
      {lista.cargando && (
        <>
          <div className="h-48 rounded-xl bg-surface-container-highest animate-pulse opacity-20" aria-hidden="true" />
          <div className="h-48 rounded-xl bg-surface-container-highest animate-pulse opacity-20" aria-hidden="true" />
        </>
      )}
      {!lista.cargando && !lista.error && lista.items.length === 0 && (
        <p className="text-on-surface-variant">{t("novedades.empty")}</p>
      )}
      {lista.items.map((publicacion) => (
        <PublicacionCard key={publicacion.id} publicacion={publicacion} hasAccess={hasAccess} isLoggedIn={isLoggedIn} onLoginClick={onLoginClick} />
      ))}
      {lista.cargandoMas && <div className="h-48 rounded-xl bg-surface-container-highest animate-pulse opacity-20" aria-hidden="true" />}
      <InfiniteScrollSentinel onVisible={lista.cargarMas} disabled={!lista.hayMas || lista.cargando || lista.cargandoMas} />
    </div>
  );
};
