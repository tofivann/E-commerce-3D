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
  // true cuando se abre desde "Publicar a la tienda": deja marcado
  // "publicar al guardar" (el admin puede desmarcarlo igual).
  publicarAlAbrir?: boolean;
}

// Nombre de la Categoria a preseleccionar según el tipo de comisión — el
// admin igual puede cambiarla a cualquier otra disponible antes de guardar.
const CATEGORIA_SUGERIDA: Record<Item["tipo"], string> = {
  motion: "Motion",
  modelo: "Modelo",
};

// Datos de reventa (DatosPublicacion en el backend): lo que tendrá el
// Producto si esta comisión se publica en la tienda. Se guardan en el mismo
// PATCH que la entrega; todos opcionales al guardar, obligatorios (salvo el
// video) solo si se marca "publicar al guardar".
interface FormPublicacion {
  titulo: string;
  descripcion: string;
  precio: string;
  formato: string;
  linkYoutube: string;
}

// Título sugerido cuando la comisión todavía no tiene datos de reventa.
function tituloSugerido(item: Item): string {
  return item.tipo === "motion"
    ? `${item.data.nombre_cancion} (${item.data.nombre_juego})`
    : `${item.data.nombre_personaje} (${item.data.juego.nombre})`;
}

function formInicial(item: Item): FormPublicacion {
  return {
    titulo: item.data.titulo_publicacion || tituloSugerido(item),
    descripcion: item.data.descripcion_publicacion || "",
    precio: item.data.precio_publicacion == null ? "" : String(item.data.precio_publicacion),
    formato: item.data.formato_archivo_publicacion || "",
    linkYoutube: item.data.link_youtube || "",
  };
}

function nombreDeArchivo(url: string | null): string {
  if (!url) return "";
  return decodeURIComponent(url.split("/").pop() ?? "");
}

const inputClass =
  "w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass = "block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2";

export const CompletarComisionModal: React.FC<CompletarComisionModalProps> = ({
  item,
  onClose,
  onCompletado,
  publicarAlAbrir = false,
}) => {
  const { t, i18n } = useTranslation();
  const [archivoEntrega, setArchivoEntrega] = useState<File | null>(null);
  const [fotoEntrega, setFotoEntrega] = useState<File | null>(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string>("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaIds, setCategoriaIds] = useState<number[]>([]);
  const [form, setForm] = useState<FormPublicacion>({ titulo: "", descripcion: "", precio: "", formato: "", linkYoutube: "" });
  const [publicarAhora, setPublicarAhora] = useState(false);
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
      setCategoriaIds([]);
      return;
    }
    setForm(formInicial(item));
    setPublicarAhora(publicarAlAbrir && !item.data.producto_publicado);
    if (item.data.categorias && item.data.categorias.length > 0) {
      setCategoriaIds(item.data.categorias.map((c) => c.id));
      return;
    }
    const sugerida = categorias.find((c) => c.nombre === CATEGORIA_SUGERIDA[item.tipo]);
    setCategoriaIds(sugerida ? [sugerida.id] : []);
  }, [item, categorias, publicarAlAbrir]);

  useEffect(() => {
    if (!fotoEntrega) return;
    const objectUrl = URL.createObjectURL(fotoEntrega);
    setFotoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [fotoEntrega]);

  if (!item) return null;

  const nombreItem = item.tipo === "motion" ? item.data.nombre_cancion : item.data.nombre_personaje;
  // Al reabrir una comisión ya entregada (reemplazar archivo, o completar los
  // datos de reventa para publicar) no hay que volver a subir archivo y foto.
  const yaTieneEntrega = Boolean(item.data.archivo_entrega && item.data.foto_entrega);
  const yaPublicado = Boolean(item.data.producto_publicado);
  const datosReventaCompletos =
    form.titulo.trim() !== "" && form.descripcion.trim() !== "" && form.precio !== "" && form.formato.trim() !== "";

  const actualizarForm = (cambios: Partial<FormPublicacion>) => setForm((prev) => ({ ...prev, ...cambios }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const faltaEntrega = !yaTieneEntrega && (!archivoEntrega || !fotoEntrega);
    if (faltaEntrega || categoriaIds.length === 0) {
      setError(t("completarComisionModal.errorMissing"));
      return;
    }
    if (publicarAhora && !datosReventaCompletos) {
      setError(t("completarComisionModal.errorPublishMissing"));
      return;
    }

    setSaving(true);
    const formData = new FormData();
    if (archivoEntrega) formData.append("archivo_entrega", archivoEntrega);
    if (fotoEntrega) formData.append("foto_entrega", fotoEntrega);
    categoriaIds.forEach((id) => formData.append("categorias", String(id)));
    formData.append("titulo_publicacion", form.titulo.trim());
    formData.append("descripcion_publicacion", form.descripcion.trim());
    formData.append("formato_archivo_publicacion", form.formato.trim());
    formData.append("link_youtube", form.linkYoutube.trim());
    // Vacío se omite (no se manda ""): el backend lo rechazaría como
    // decimal inválido, y un precio en blanco simplemente sigue sin definir.
    if (form.precio !== "") formData.append("precio_publicacion", form.precio);

    try {
      if (item.tipo === "motion") {
        await comisionesAdminApi.actualizarSolicitudMotion(item.data.id, formData);
      } else {
        await comisionesAdminApi.actualizarSolicitudModelo(item.data.id, formData);
      }
    } catch (err) {
      console.error("Error al completar la comisión:", err);
      setError(t("completarComisionModal.errorSave"));
      setSaving(false);
      return;
    }

    if (publicarAhora) {
      try {
        if (item.tipo === "motion") {
          await comisionesAdminApi.publicarComisionMotion(item.data.id);
        } else {
          await comisionesAdminApi.publicarComisionModelo(item.data.id);
        }
      } catch (err) {
        // La entrega ya quedó guardada; solo falló publicar. Se deja el modal
        // abierto para reintentar (volver a guardar es idempotente).
        console.error("Error al publicar el producto:", err);
        setError(t("completarComisionModal.errorPublish"));
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onCompletado();
  };

  const textoBoton = saving
    ? publicarAhora
      ? t("completarComisionModal.publishingNow")
      : t("completarComisionModal.submitting")
    : publicarAhora
    ? t("completarComisionModal.submitAndPublish")
    : yaTieneEntrega
    ? t("completarComisionModal.submitUpdate")
    : t("completarComisionModal.submit");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={saving ? undefined : onClose} />
      <div className="glass-panel relative w-full max-w-2xl rounded-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto bg-surface-container-lowest/95">
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
          {yaTieneEntrega
            ? t("completarComisionModal.descriptionUpdate", { name: nombreItem })
            : t("completarComisionModal.description", { name: nombreItem })}
        </p>

        {error && (
          <div className="bg-error/20 border border-error text-on-error-container p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* ---- Entrega: archivo + foto + categorías ---- */}
          <div>
            <label className={labelClass}>{t("completarComisionModal.zipLabel")}</label>
            <div
              onClick={() => document.getElementById("archivoEntregaInput")?.click()}
              className="border-2 border-dashed rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all border-outline-variant/50 hover:border-primary/50 hover:bg-surface-variant/20"
            >
              <span className="material-symbols-outlined text-[28px] text-outline shrink-0">folder_zip</span>
              <p className="font-semibold text-on-surface text-sm truncate">
                {archivoEntrega
                  ? archivoEntrega.name
                  : yaTieneEntrega
                  ? t("completarComisionModal.keepCurrentFile", { name: nombreDeArchivo(item.data.archivo_entrega) })
                  : t("completarComisionModal.zipNone")}
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
            <label className={labelClass}>{t("completarComisionModal.photoLabel")}</label>
            <div
              onClick={() => document.getElementById("fotoEntregaInput")?.click()}
              className="border-2 border-dashed rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all border-outline-variant/50 hover:border-primary/50 hover:bg-surface-variant/20"
            >
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-container-lowest border border-outline-variant/30 shrink-0 flex items-center justify-center">
                {fotoPreviewUrl || item.data.foto_entrega ? (
                  <img
                    src={fotoPreviewUrl || (item.data.foto_entrega as string)}
                    alt={t("completarComisionModal.photoLabel")}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined text-outline">image</span>
                )}
              </div>
              <p className="font-semibold text-on-surface text-sm truncate">
                {fotoEntrega
                  ? fotoEntrega.name
                  : yaTieneEntrega
                  ? t("completarComisionModal.keepCurrentPhoto")
                  : t("completarComisionModal.photoNone")}
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
            <label className={labelClass}>{t("completarComisionModal.categoryLabel")}</label>
            <div className="flex flex-wrap gap-2">
              {categorias.map((categoria) => {
                const seleccionada = categoriaIds.includes(categoria.id);
                return (
                  <button
                    key={categoria.id}
                    type="button"
                    onClick={() =>
                      setCategoriaIds(
                        seleccionada
                          ? categoriaIds.filter((id) => id !== categoria.id)
                          : [...categoriaIds, categoria.id]
                      )
                    }
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                      seleccionada
                        ? "bg-primary-container text-on-primary-fixed border-primary-container"
                        : "bg-transparent text-on-surface-variant border-outline-variant/50 hover:border-primary/50"
                    }`}
                  >
                    {nombreCategoria(categoria, i18n.language)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---- Datos para la tienda (reventa) ---- */}
          <fieldset className="border-t border-outline-variant/30 pt-5 flex flex-col gap-4">
            <div>
              <h3 className="font-semibold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary-fixed-dim">storefront</span>
                {t("completarComisionModal.publishSection")}
              </h3>
              <p className="text-on-surface-variant text-xs mt-1">{t("completarComisionModal.publishSectionHelp")}</p>
            </div>

            <div>
              <label className={labelClass}>{t("productForm.titleLabel")}</label>
              <input
                maxLength={200}
                className={inputClass}
                value={form.titulo}
                onChange={(e) => actualizarForm({ titulo: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>{t("productForm.descriptionLabel")}</label>
              <textarea
                rows={3}
                className={`${inputClass} resize-y`}
                value={form.descripcion}
                onChange={(e) => actualizarForm({ descripcion: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t("completarComisionModal.resalePrice")}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={form.precio}
                  onChange={(e) => actualizarForm({ precio: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>{t("completarComisionModal.format")}</label>
                <input
                  maxLength={50}
                  placeholder="STL, OBJ, FBX..."
                  className={inputClass}
                  value={form.formato}
                  onChange={(e) => actualizarForm({ formato: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>{t("completarComisionModal.videoLabel")}</label>
              <input
                type="url"
                maxLength={500}
                placeholder="https://www.youtube.com/watch?v=..."
                className={inputClass}
                value={form.linkYoutube}
                onChange={(e) => actualizarForm({ linkYoutube: e.target.value })}
              />
              <p className="text-on-surface-variant text-xs mt-1">{t("completarComisionModal.videoHelp")}</p>
            </div>

            <p className="text-on-surface-variant text-xs flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">photo_camera</span>
              {t("completarComisionModal.autoPhotoNote")}
            </p>

            {yaPublicado ? (
              <p className="text-on-surface-variant text-xs flex items-center gap-1.5 bg-surface-container-low rounded-lg p-3">
                <span className="material-symbols-outlined text-[16px] text-primary-fixed-dim">check_circle</span>
                {t("completarComisionModal.alreadyPublished", { id: item.data.producto_publicado })}
              </p>
            ) : (
              <label className="flex items-start gap-3 bg-surface-container-low rounded-lg p-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={publicarAhora}
                  onChange={(e) => setPublicarAhora(e.target.checked)}
                />
                <span>
                  <span className="block font-semibold text-on-surface text-sm">{t("completarComisionModal.publishNow")}</span>
                  <span className="block text-on-surface-variant text-xs mt-0.5">{t("completarComisionModal.publishNowHelp")}</span>
                </span>
              </label>
            )}
          </fieldset>

          <div className="flex justify-end gap-4 pt-4 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors font-semibold cursor-pointer disabled:opacity-50"
            >
              {t("productForm.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-2.5 px-8 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">{publicarAhora ? "rocket_launch" : "check_circle"}</span>
              )}
              {textoBoton}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
