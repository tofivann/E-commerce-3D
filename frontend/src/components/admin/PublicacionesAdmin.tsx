import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { novedadesApi } from "../../api/novedades.api";
import type { Publicacion } from "../../api/novedades.api";
import { useListaPaginada } from "../../hooks/useListaPaginada";
import { InfiniteScrollSentinel } from "../ui/InfiniteScrollSentinel";
import { PublicacionForm } from "./PublicacionForm";

const idDePublicacion = (publicacion: Publicacion) => publicacion.id;
// Con borradores (solo el staff los recibe). Fuera del componente: debe ser estable.
const cargarTodas = (page: number) => novedadesApi.listar(page, true);

// Panel admin "Novedades": la lista de publicaciones (incluidos borradores)
// con crear, editar y borrar. Los comentarios se moderan desde la página
// pública de Novedades, donde el staff ve "Borrar" en todos.
export const PublicacionesAdmin: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lista = useListaPaginada<Publicacion>({ clave: "admin-publicaciones", cargarPagina: cargarTodas, obtenerId: idDePublicacion });
  // undefined = cerrado; null = nueva; objeto = editar.
  const [editando, setEditando] = useState<Publicacion | null | undefined>(undefined);

  const borrar = async (publicacion: Publicacion) => {
    if (!window.confirm(t("adminNovedades.confirmDelete", { titulo: publicacion.titulo }))) return;
    try {
      await novedadesApi.eliminar(publicacion.id);
      lista.eliminarItem(publicacion.id);
    } catch (err) {
      console.error("Error al borrar la publicación:", err);
      window.alert(t("adminNovedades.errorDelete"));
    }
  };

  const fecha = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface mb-1">{t("adminNovedades.title")}</h1>
          <p className="text-on-surface-variant">{t("adminNovedades.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditando(null)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-container px-5 py-3 font-semibold text-on-primary-fixed hover:bg-primary-fixed-dim"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          {t("adminNovedades.new")}
        </button>
      </div>

      {lista.error && <p className="text-error text-sm">{t("novedades.loadError")}</p>}
      {lista.cargando && <div className="h-40 rounded-xl bg-surface-container-highest animate-pulse opacity-20" aria-hidden="true" />}
      {!lista.cargando && !lista.error && lista.items.length === 0 && (
        <p className="text-on-surface-variant">{t("adminNovedades.empty")}</p>
      )}

      <ul className="flex flex-col gap-3">
        {lista.items.map((publicacion) => (
          <li key={publicacion.id} className="glass-panel rounded-xl p-4 md:p-5 flex flex-wrap items-center gap-4">
            {publicacion.fotos[0] && (
              <img
                src={publicacion.fotos[0].imagen_miniatura ?? publicacion.fotos[0].imagen}
                alt=""
                loading="lazy"
                className="h-16 w-16 shrink-0 rounded-lg object-cover bg-surface-container-lowest"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-on-surface truncate">{publicacion.titulo}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                    publicacion.publicado ? "bg-secondary-container text-on-secondary-container" : "border border-outline-variant text-on-surface-variant"
                  }`}
                >
                  {publicacion.publicado ? t("adminNovedades.published") : t("adminNovedades.draft")}
                </span>
              </div>
              <p className="text-on-surface-variant text-sm mt-1">
                {fecha(publicacion.fecha_creacion)} · {t("adminNovedades.photosCount", { count: publicacion.fotos.length })} ·{" "}
                {t("novedades.comments", { count: publicacion.total_comentarios })}
                {publicacion.link_youtube && <> · {t("adminNovedades.hasVideo")}</>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditando(publicacion)}
                aria-label={t("adminNovedades.edit")}
                title={t("adminNovedades.edit")}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant text-on-surface hover:border-primary/60 hover:text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
              <button
                type="button"
                onClick={() => borrar(publicacion)}
                aria-label={t("adminNovedades.delete")}
                title={t("adminNovedades.delete")}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant text-on-surface hover:border-error/60 hover:text-error"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
      {lista.cargandoMas && <div className="mt-3 h-20 rounded-xl bg-surface-container-highest animate-pulse opacity-20" aria-hidden="true" />}
      <InfiniteScrollSentinel onVisible={lista.cargarMas} disabled={!lista.hayMas || lista.cargando || lista.cargandoMas} />

      {editando !== undefined && (
        <PublicacionForm
          publicacion={editando}
          onClose={() => setEditando(undefined)}
          onSaved={() => {
            setEditando(undefined);
            lista.recargar();
          }}
        />
      )}
    </div>
  );
};
