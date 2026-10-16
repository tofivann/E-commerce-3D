import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { novedadesApi } from "../../api/novedades.api";
import type { Comentario } from "../../api/novedades.api";
import { useListaPaginada } from "../../hooks/useListaPaginada";
import { Avatar } from "../ui/Avatar";
import { InfiniteScrollSentinel } from "../ui/InfiniteScrollSentinel";

interface ComentariosProps {
  publicacionId: number;
  // Suscriptor o staff: puede escribir. Sin sesión, o pendiente de pago, solo lee.
  hasAccess: boolean;
  isLoggedIn: boolean;
  onLoginClick?: () => void;
  // Avisa al padre para que ajuste el contador de la publicación.
  onCambioTotal?: (delta: number) => void;
}

const idDeComentario = (comentario: Comentario) => comentario.id;

// Hilo plano de comentarios de una publicación, del más antiguo al más
// nuevo, con la caja para escribir al final. Cada uno puede borrar el suyo;
// el staff, cualquiera (lo decide el backend: `puede_borrar`).
export const Comentarios: React.FC<ComentariosProps> = ({ publicacionId, hasAccess, isLoggedIn, onLoginClick, onCambioTotal }) => {
  const { t, i18n } = useTranslation();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useCallback: useListaPaginada vuelve a pedir la lista si cambia esta función.
  const cargarPagina = useCallback((page: number) => novedadesApi.listarComentarios(publicacionId, page), [publicacionId]);
  const lista = useListaPaginada<Comentario>({
    clave: `comentarios-${publicacionId}`,
    cargarPagina,
    obtenerId: idDeComentario,
  });

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await novedadesApi.comentar(publicacionId, limpio);
      setTexto("");
      onCambioTotal?.(1);
      lista.recargar();
    } catch (err) {
      console.error("Error al comentar:", err);
      setError(t("novedades.commentError"));
    } finally {
      setEnviando(false);
    }
  };

  const borrar = async (comentario: Comentario) => {
    if (!window.confirm(t("novedades.confirmDeleteComment"))) return;
    lista.eliminarItem(comentario.id);
    try {
      await novedadesApi.eliminarComentario(comentario.id);
      onCambioTotal?.(-1);
    } catch (err) {
      console.error("Error al borrar el comentario:", err);
      window.alert(t("novedades.deleteError"));
      lista.recargar();
    }
  };

  const fecha = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-4 border-t border-outline-variant/40 pt-4">
      {lista.error && <p className="text-error text-sm">{t("novedades.loadError")}</p>}
      {lista.cargando && <div className="h-12 rounded-lg bg-surface-container-highest animate-pulse opacity-20" aria-hidden="true" />}
      {!lista.cargando && !lista.error && lista.items.length === 0 && (
        <p className="text-on-surface-variant text-sm">{t("novedades.noComments")}</p>
      )}

      <ul className="flex flex-col gap-3">
        {lista.items.map((comentario) => (
          <li key={comentario.id} className="flex gap-3">
            <Avatar foto={comentario.usuario.foto_perfil} nombre={comentario.usuario.nombre || comentario.usuario.username} tamano="sm" />
            <div className="min-w-0 flex-1 rounded-lg bg-surface-container-lowest/70 px-3 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-semibold text-on-surface">{comentario.usuario.nombre || comentario.usuario.username}</span>
                <span className="text-[11px] text-on-surface-variant">{fecha(comentario.fecha_creacion)}</span>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm text-on-surface">{comentario.texto}</p>
              {comentario.puede_borrar && (
                <button
                  type="button"
                  onClick={() => borrar(comentario)}
                  className="mt-1 text-[11px] font-semibold text-on-surface-variant hover:text-error"
                >
                  {t("novedades.deleteComment")}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {lista.cargandoMas && <p className="text-on-surface-variant text-xs text-center">{t("novedades.loading")}</p>}
      <InfiniteScrollSentinel onVisible={lista.cargarMas} disabled={!lista.hayMas || lista.cargando || lista.cargandoMas} />

      {hasAccess ? (
        <form onSubmit={enviar} className="flex flex-col gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={t("novedades.writePlaceholder")}
            rows={2}
            maxLength={2000}
            className="w-full resize-y rounded-lg border border-outline-variant bg-surface-variant px-4 py-3 text-sm text-on-surface placeholder:text-outline outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {error && <p className="text-error text-sm">{error}</p>}
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            className="self-end rounded-lg bg-primary-container px-5 py-2 text-sm font-semibold text-on-primary-fixed transition-colors hover:bg-primary-fixed-dim disabled:opacity-50"
          >
            {enviando ? t("novedades.sending") : t("novedades.send")}
          </button>
        </form>
      ) : isLoggedIn ? (
        <p className="text-on-surface-variant text-sm">{t("novedades.subscribeToComment")}</p>
      ) : (
        <p className="text-on-surface-variant text-sm">
          <button type="button" onClick={onLoginClick} className="font-semibold text-primary hover:underline">
            {t("novedades.loginToComment")}
          </button>
        </p>
      )}
    </div>
  );
};
