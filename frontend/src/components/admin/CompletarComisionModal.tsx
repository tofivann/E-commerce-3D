import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Categoria } from "../../api/comisiones.api";
import { comisionesAdminApi } from "../../api/comisiones.api";
import { categoriasApi } from "../../api/productos.api";
import { nombreCategoria } from "../../utils/categoria";
import type { Item } from "./SolicitudesComisionesTable";

interface CompletarComisionModalProps {
  item: Item | null;
  onClose: () => void;
  onCompletado: () => void;
}

// Nombre de la Categoria a preseleccionar según el tipo de comisión — el
// admin igual puede cambiarla a cualquier otra disponible antes de guardar.
const CATEGORIA_SUGERIDA: Record<Item["tipo"], string> = {
  motion: "Motion",
  modelo: "Modelo",
};

export const CompletarComisionModal: React.FC<CompletarComisionModalProps> = ({
  item,
  onClose,
  onCompletado,
}) => {
  const { t, i18n } = useTranslation();
  const [archivoEntrega, setArchivoEntrega] = useState<File | null>(null);
  const [fotoEntrega, setFotoEntrega] = useState<File | null>(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string>("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    categoriasApi.listar().then(setCategorias).catch((err) => console.error("Error al cargar categorías:", err));
  }, []);

  useEffect(() => {
    setArchivoEntrega(null);
    setFotoEntrega(null);
    setFotoPreviewUrl("");
    setError(null);
    if (!item) {
      setCategoriaId("");
      return;
    }
    const sugerida = categorias.find((c) => c.nombre === CATEGORIA_SUGERIDA[item.tipo]);
    setCategoriaId(item.data.categoria ? String(item.data.categoria.id) : sugerida ? String(sugerida.id) : "");
  }, [item, categorias]);

  useEffect(() => {
    if (!fotoEntrega) return;
    const objectUrl = URL.createObjectURL(fotoEntrega);
    setFotoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [fotoEntrega]);

  if (!item) return null;

  const nombreItem = item.tipo === "motion" ? item.data.nombre_cancion : item.data.nombre_personaje;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!archivoEntrega || !fotoEntrega || !categoriaId) {
      setError(t("completarComisionModal.errorMissing"));
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("archivo_entrega", archivoEntrega);
      formData.append("foto_entrega", fotoEntrega);
      formData.append("categoria", categoriaId);
      if (item.tipo === "motion") {
        await comisionesAdminApi.actualizarSolicitudMotion(item.data.id, formData);
      } else {
        await comisionesAdminApi.actualizarSolicitudModelo(item.data.id, formData);
      }
      onCompletado();
    } catch (err) {
      console.error("Error al completar la comisión:", err);
      setError(t("completarComisionModal.errorSave"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={saving ? undefined : onClose} />
      <div className="glass-panel relative w-full max-w-lg rounded-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto bg-surface-container-lowest/95">
        <button
          type="button"
          className="absolute top-6 right-6 text-on-surface-variant hover:text-primary transition-colors disabled:opacity-40"
          onClick={onClose}
          disabled={saving}
          aria-label={t("common.close")}
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="text-2xl font-bold text-on-surface mb-2">{t("completarComisionModal.title")}</h2>
        <p className="text-on-surface-variant mb-6 text-sm">
          {t("completarComisionModal.description", { name: nombreItem })}
        </p>

        {error && (
          <div className="bg-error/20 border border-error text-on-error-container p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
              {t("completarComisionModal.zipLabel")}
            </label>
            <div
              onClick={() => document.getElementById("archivoEntregaInput")?.click()}
              className="border-2 border-dashed rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all border-outline-variant/50 hover:border-primary/50 hover:bg-surface-variant/20"
            >
              <span className="material-symbols-outlined text-[28px] text-outline shrink-0">folder_zip</span>
              <p className="font-semibold text-on-surface text-sm truncate">
                {archivoEntrega ? archivoEntrega.name : t("completarComisionModal.zipNone")}
              </p>
              <input
                id="archivoEntregaInput"
                type="file"
                className="hidden"
                onChange={(e) => setArchivoEntrega(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
              {t("completarComisionModal.photoLabel")}
            </label>
            <div
              onClick={() => document.getElementById("fotoEntregaInput")?.click()}
              className="border-2 border-dashed rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all border-outline-variant/50 hover:border-primary/50 hover:bg-surface-variant/20"
            >
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-container-lowest border border-outline-variant/30 shrink-0 flex items-center justify-center">
                {fotoPreviewUrl ? (
                  <img src={fotoPreviewUrl} alt={t("completarComisionModal.photoLabel")} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-outline">image</span>
                )}
              </div>
              <p className="font-semibold text-on-surface text-sm truncate">
                {fotoEntrega ? fotoEntrega.name : t("completarComisionModal.photoNone")}
              </p>
              <input
                id="fotoEntregaInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFotoEntrega(e.target.files?.[0] || null)}
              />
            </div>
            <p className="text-on-surface-variant text-xs mt-1">{t("completarComisionModal.photoHelp")}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
              {t("completarComisionModal.categoryLabel")}
            </label>
            <select
              required
              className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="" disabled>{t("productForm.categoryPlaceholder")}</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>{nombreCategoria(categoria, i18n.language)}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors font-semibold disabled:opacity-50"
            >
              {t("productForm.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-2.5 px-8 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
              )}
              {saving ? t("completarComisionModal.submitting") : t("completarComisionModal.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
