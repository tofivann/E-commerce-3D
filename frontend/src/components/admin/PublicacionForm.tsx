import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { novedadesApi } from "../../api/novedades.api";
import type { Publicacion } from "../../api/novedades.api";
import { extraerErroresValidacion } from "../../utils/erroresApi";

interface PublicacionFormProps {
  // Sin publicación: crear una nueva.
  publicacion?: Publicacion | null;
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none";
const labelClass = "block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2";

// Modal para redactar o editar una novedad: título, texto, enlace de
// YouTube, publicada/borrador y fotos (las que ya están se pueden quitar;
// las nuevas se eligen del disco). Todo va en un solo multipart. Los errores
// del backend se muestran bajo su campo. Se pinta con un portal porque
// .glass-panel (backdrop-filter) rompería el position: fixed.
export const PublicacionForm: React.FC<PublicacionFormProps> = ({ publicacion, onClose, onSaved }) => {
  const { t } = useTranslation();
  const inputFotos = useRef<HTMLInputElement>(null);
  const [titulo, setTitulo] = useState(publicacion?.titulo ?? "");
  const [texto, setTexto] = useState(publicacion?.texto ?? "");
  const [link, setLink] = useState(publicacion?.link_youtube ?? "");
  const [publicado, setPublicado] = useState(publicacion?.publicado ?? true);
  const [fotosNuevas, setFotosNuevas] = useState<File[]>([]);
  const [fotosEliminar, setFotosEliminar] = useState<number[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const fotosActuales = (publicacion?.fotos ?? []).filter((f) => !fotosEliminar.includes(f.id));

  const elegirFotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const elegidas = Array.from(e.target.files ?? []);
    setFotosNuevas((previas) => [...previas, ...elegidas]);
    e.target.value = "";
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setErrores({});
    const datos = { titulo: titulo.trim(), texto: texto.trim(), link_youtube: link.trim(), publicado, fotosNuevas, fotosEliminar };
    try {
      if (publicacion) await novedadesApi.editar(publicacion.id, datos);
      else await novedadesApi.crear(datos);
      onSaved();
    } catch (err) {
      console.error("Error al guardar la publicación:", err);
      setErrores(extraerErroresValidacion(err) ?? { "": t("adminNovedades.errorSave") });
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="titulo-publicacion-form">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={guardar} className="relative glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-6 md:p-8 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <h2 id="titulo-publicacion-form" className="text-2xl font-bold text-on-surface">
            {publicacion ? t("adminNovedades.formEditTitle") : t("adminNovedades.formNewTitle")}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {errores[""] && <p className="text-error text-sm">{errores[""]}</p>}

        <div>
          <label htmlFor="pub-titulo" className={labelClass}>{t("adminNovedades.titleLabel")}</label>
          <input id="pub-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={200} className={inputClass} />
          {errores.titulo && <p className="text-error text-xs mt-1">{errores.titulo}</p>}
        </div>

        <div>
          <label htmlFor="pub-texto" className={labelClass}>{t("adminNovedades.textLabel")}</label>
          <textarea id="pub-texto" value={texto} onChange={(e) => setTexto(e.target.value)} rows={6} className={`${inputClass} resize-y`} />
          {errores.texto && <p className="text-error text-xs mt-1">{errores.texto}</p>}
        </div>

        <div>
          <label htmlFor="pub-video" className={labelClass}>{t("adminNovedades.videoLabel")}</label>
          {/* type="text": con type="url" el navegador bloquea un enlace sin https:// antes de poder explicarlo. */}
          <input id="pub-video" type="text" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder={t("adminNovedades.videoPlaceholder")} className={inputClass} />
          <p className="text-on-surface-variant text-xs mt-1">{t("adminNovedades.videoHint")}</p>
          {errores.link_youtube && <p className="text-error text-xs mt-1">{errores.link_youtube}</p>}
        </div>

        <div>
          <span className={labelClass}>{t("adminNovedades.photosLabel")}</span>
          {(fotosActuales.length > 0 || fotosNuevas.length > 0) && (
            <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
              {fotosActuales.map((foto) => (
                <li key={`f-${foto.id}`} className="relative aspect-square overflow-hidden rounded-lg bg-surface-container-lowest">
                  <img src={foto.imagen_miniatura ?? foto.imagen} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotosEliminar((ids) => [...ids, foto.id])}
                    aria-label={t("adminNovedades.removePhoto")}
                    title={t("adminNovedades.removePhoto")}
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 text-on-surface hover:text-error"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </li>
              ))}
              {fotosNuevas.map((foto, i) => (
                <li key={`n-${i}-${foto.name}`} className="relative aspect-square overflow-hidden rounded-lg bg-surface-container-lowest">
                  <img src={URL.createObjectURL(foto)} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotosNuevas((lista) => lista.filter((_, j) => j !== i))}
                    aria-label={t("adminNovedades.removePhoto")}
                    title={t("adminNovedades.removePhoto")}
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 text-on-surface hover:text-error"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input ref={inputFotos} type="file" accept="image/*" multiple onChange={elegirFotos} className="hidden" />
          <button
            type="button"
            onClick={() => inputFotos.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface hover:border-primary/60 hover:bg-primary/10"
          >
            <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
            {t("adminNovedades.addPhotos")}
          </button>
          <p className="text-on-surface-variant text-xs mt-1">{t("adminNovedades.photosHint")}</p>
          {errores.fotos && <p className="text-error text-xs mt-1">{errores.fotos}</p>}
        </div>

        <label className="flex items-center gap-3 text-sm text-on-surface">
          <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary" />
          {t("adminNovedades.publishedLabel")}
          <span className="text-on-surface-variant text-xs">— {t("adminNovedades.draftHint")}</span>
        </label>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-outline-variant px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low">
            {t("adminNovedades.cancel")}
          </button>
          <button type="submit" disabled={guardando || !titulo.trim()} className="rounded-lg bg-primary-container px-5 py-2.5 text-sm font-semibold text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50">
            {guardando ? t("adminNovedades.saving") : t("adminNovedades.save")}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
};
