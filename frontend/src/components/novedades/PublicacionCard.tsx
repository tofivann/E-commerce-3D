import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Publicacion } from "../../api/novedades.api";
import { YoutubeEmbed } from "../ui/YoutubeEmbed";
import { Comentarios } from "./Comentarios";

interface PublicacionCardProps {
  publicacion: Publicacion;
  hasAccess: boolean;
  isLoggedIn: boolean;
  onLoginClick?: () => void;
}

// Una novedad: título y fecha, texto, fotos (miniaturas que abren la
// original), el video de YouTube si lo hay, y los comentarios plegados.
export const PublicacionCard: React.FC<PublicacionCardProps> = ({ publicacion, hasAccess, isLoggedIn, onLoginClick }) => {
  const { t, i18n } = useTranslation();
  const [abiertos, setAbiertos] = useState(false);
  // Contador local: se ajusta al comentar/borrar sin volver a pedir la lista.
  const [total, setTotal] = useState(publicacion.total_comentarios);

  const fecha = new Date(publicacion.fecha_creacion).toLocaleDateString(i18n.language, { year: "numeric", month: "long", day: "numeric" });

  return (
    <article className="glass-panel rounded-xl p-5 md:p-6 flex flex-col gap-4">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl md:text-2xl font-bold text-on-surface">{publicacion.titulo}</h2>
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          {!publicacion.publicado && (
            <span className="rounded-full border border-outline-variant px-2 py-0.5 font-semibold uppercase tracking-wider">{t("novedades.draft")}</span>
          )}
          <time dateTime={publicacion.fecha_creacion}>{fecha}</time>
        </div>
      </header>

      {publicacion.texto && <p className="whitespace-pre-line text-on-surface leading-relaxed">{publicacion.texto}</p>}

      {publicacion.fotos.length > 0 && (
        <ul className={`grid gap-2 ${publicacion.fotos.length === 1 ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3"}`}>
          {publicacion.fotos.map((foto) => (
            <li key={foto.id} className="overflow-hidden rounded-lg bg-surface-container-lowest">
              {/* Fotos públicas (no son archivos de pago): el enlace abre la original. */}
              <a href={foto.imagen} target="_blank" rel="noreferrer">
                <img
                  src={foto.imagen_miniatura ?? foto.imagen}
                  alt={t("novedades.photoAlt", { titulo: publicacion.titulo })}
                  loading="lazy"
                  className={`w-full object-cover ${publicacion.fotos.length === 1 ? "max-h-[520px]" : "aspect-[4/3]"}`}
                />
              </a>
            </li>
          ))}
        </ul>
      )}

      {publicacion.link_youtube && (
        <YoutubeEmbed
          url={publicacion.link_youtube}
          title={publicacion.titulo}
          className="overflow-hidden rounded-lg"
          fallback={
            <a href={publicacion.link_youtube} target="_blank" rel="noreferrer" className="text-primary font-semibold hover:underline">
              {publicacion.link_youtube}
            </a>
          }
        />
      )}

      <button
        type="button"
        onClick={() => setAbiertos((v) => !v)}
        aria-expanded={abiertos}
        className="group self-start inline-flex items-center gap-2 text-sm font-semibold text-primary"
      >
        <span className="material-symbols-outlined text-[18px]">{abiertos ? "expand_less" : "chat_bubble"}</span>
        {/* El subrayado solo en el texto, no en el icono. */}
        <span className="group-hover:underline">{abiertos ? t("novedades.hideComments") : t("novedades.comments", { count: total })}</span>
      </button>

      {abiertos && (
        <Comentarios
          publicacionId={publicacion.id}
          hasAccess={hasAccess}
          isLoggedIn={isLoggedIn}
          onLoginClick={onLoginClick}
          onCambioTotal={(delta) => setTotal((n) => Math.max(0, n + delta))}
        />
      )}
    </article>
  );
};
