import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Categoria } from "../../api/comisiones.api";
import { comisionesAdminApi } from "../../api/comisiones.api";
import { categoriasApi } from "../../api/productos.api";
import { nombreCategoria } from "../../utils/categoria";
import { Pildora } from "../ui/Pildora";
import { extraerErroresValidacion } from "../../utils/erroresApi";
import { formatearImporte, IMPORTE_VALIDO } from "../../utils/importe";
import type { ErroresPorCampo } from "../../utils/erroresApi";
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
    // Sin precio de reventa guardado se sugiere lo que el cliente pagó por la
    // comisión (Orden.total, que incluye lo que haya pagado de más sobre el
    // mínimo). Es solo el valor inicial: el admin puede cambiarlo.
    precio: formatearImporte(item.data.precio_publicacion ?? item.data.orden.total),
    formato: item.data.formato_archivo_publicacion || "",
    linkYoutube: item.data.link_youtube || "",
  };
}

function nombreDeArchivo(url: string | null): string {
  if (!url) return "";
  return decodeURIComponent(url.split("/").pop() ?? "");
}

// Mismas clases que ProductForm: este modal es "el formulario de producto"
// más el bloque de entrega, y debe verse igual.
const inputClass =
  "w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner";
const inputErrorClass = "border-error focus:border-error focus:ring-error";
const labelClass = "block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2";
const dropZoneClass = (activo: boolean) =>
  `border-2 border-dashed rounded-xl cursor-pointer transition-all ${
    activo ? "border-primary bg-primary-container/10" : "border-outline-variant/50 hover:border-primary/50 hover:bg-surface-variant/20"
  }`;

// Nombre del campo en el backend (DRF devuelve los errores del 400 con esta
// clave) -> campo del formulario. Sirve para pintar el error al lado del
// input equivocado en vez de un mensaje genérico arriba.
const CAMPO_POR_ERROR: Record<string, keyof FormPublicacion> = {
  titulo_publicacion: "titulo",
  descripcion_publicacion: "descripcion",
  precio_publicacion: "precio",
  formato_archivo_publicacion: "formato",
  link_youtube: "linkYoutube",
};

type ErroresForm = Partial<Record<keyof FormPublicacion, string>>;

// El precio se valida con IMPORTE_VALIDO (como lo entiende el DecimalField
// del backend): la coma (15,50) y el símbolo ($15) son los tropiezos
// típicos — mejor avisar antes de mandar que recibir un 400.
function validarFormulario(form: FormPublicacion, t: (clave: string) => string): ErroresForm {
  const errores: ErroresForm = {};
  const precio = form.precio.trim();
  if (precio !== "" && !IMPORTE_VALIDO.test(precio)) errores.precio = t("completarComisionModal.errorPrice");
  return errores;
}

// Mensaje de un input, debajo del campo.
const ErrorCampo: React.FC<{ mensaje?: string }> = ({ mensaje }) =>
  mensaje ? <p className="text-error text-xs mt-1">{mensaje}</p> : null;

export const CompletarComisionModal: React.FC<CompletarComisionModalProps> = ({
  item,
  onClose,
  onCompletado,
  publicarAlAbrir = false,
}) => {
  const { t, i18n } = useTranslation();
  const [archivoEntrega, setArchivoEntrega] = useState<File | null>(null);
  const [archivoDragOver, setArchivoDragOver] = useState(false);
  const [fotoEntrega, setFotoEntrega] = useState<File | null>(null);
  const [fotoDragOver, setFotoDragOver] = useState(false);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string>("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaIds, setCategoriaIds] = useState<number[]>([]);
  const [form, setForm] = useState<FormPublicacion>({ titulo: "", descripcion: "", precio: "", formato: "", linkYoutube: "" });
  const [publicarAhora, setPublicarAhora] = useState(false);
  const [saving, setSaving] = useState(false);
  // Error general (arriba del formulario) y errores por campo (debajo de
  // cada input) — los del backend llegan ya con el nombre del campo.
  const [error, setError] = useState<string | null>(null);
  const [erroresCampos, setErroresCampos] = useState<ErroresForm>({});

  useEffect(() => {
    categoriasApi.listar().then(setCategorias).catch((err) => console.error("Error al cargar categorías:", err));
  }, []);

  useEffect(() => {
    setArchivoEntrega(null);
    setFotoEntrega(null);
    setFotoPreviewUrl("");
    setError(null);
    setErroresCampos({});
    if (!item) {
      setCategoriaIds([]);
      return;
    }
    setForm(formInicial(item));
    setPublicarAhora(publicarAlAbrir && !item.data.producto_publicado);
    if (item.data.categorias.length > 0) {
      setCategoriaIds(item.data.categorias);
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

  const actualizarForm = (cambios: Partial<FormPublicacion>) => {
    setForm((prev) => ({ ...prev, ...cambios }));
    // Al corregir un campo se le quita su error; el general se mantiene
    // hasta el próximo intento de guardar.
    const corregidos = Object.keys(cambios) as (keyof FormPublicacion)[];
    setErroresCampos((prev) => {
      const next = { ...prev };
      corregidos.forEach((campo) => delete next[campo]);
      return next;
    });
  };

  // Traduce el 400 del backend a errores por campo (+ general si hay uno sin
  // campo). Devuelve false si no era un error de validación.
  const mostrarErroresBackend = (err: unknown, mensajeGenerico: string): void => {
    const errores: ErroresPorCampo | null = extraerErroresValidacion(err);
    if (!errores) {
      setError(mensajeGenerico);
      return;
    }
    const porCampo: ErroresForm = {};
    let general: string | null = errores[""] ?? null;
    for (const [campoBackend, mensaje] of Object.entries(errores)) {
      if (campoBackend === "") continue;
      const campoForm = CAMPO_POR_ERROR[campoBackend];
      if (campoForm) porCampo[campoForm] = mensaje;
      // Errores de campos que no tienen input propio aquí (archivo, foto,
      // categorías...) se muestran arriba para que no se pierdan.
      else general = general ?? mensaje;
    }
    setErroresCampos(porCampo);
    setError(general ?? (Object.keys(porCampo).length > 0 ? t("completarComisionModal.errorFields") : mensajeGenerico));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErroresCampos({});

    const faltaEntrega = !yaTieneEntrega && (!archivoEntrega || !fotoEntrega);
    if (faltaEntrega || categoriaIds.length === 0) {
      setError(t("completarComisionModal.errorMissing"));
      return;
    }
    if (publicarAhora && !datosReventaCompletos) {
      setError(t("completarComisionModal.errorPublishMissing"));
      return;
    }
    const erroresLocales = validarFormulario(form, t);
    if (Object.keys(erroresLocales).length > 0) {
      setErroresCampos(erroresLocales);
      setError(t("completarComisionModal.errorFields"));
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
    // Sin "https://" también vale: el backend le antepone el esquema.
    formData.append("link_youtube", form.linkYoutube.trim());
    // Vacío se omite (no se manda ""): el backend lo rechazaría como
    // decimal inválido, y un precio en blanco simplemente sigue sin definir.
    if (form.precio.trim() !== "") formData.append("precio_publicacion", form.precio.trim());

    try {
      if (item.tipo === "motion") {
        await comisionesAdminApi.actualizarSolicitudMotion(item.data.id, formData);
      } else {
        await comisionesAdminApi.actualizarSolicitudModelo(item.data.id, formData);
      }
    } catch (err) {
      console.error("Error al completar la comisión:", err);
      mostrarErroresBackend(err, t("completarComisionModal.errorSave"));
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
        mostrarErroresBackend(err, t("completarComisionModal.errorPublish"));
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

        {/* Mismo orden y mismos bloques que ProductForm (archivo → título →
            descripción → precio/formato → categorías → video → imagen), más
            el checkbox de publicar al final. Lo único distinto es qué se
            guarda: aquí la entrega de la comisión + sus datos de reventa. */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Zona de archivo (entrega) — igual que la del archivo 3D del producto */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArchivoDragOver(true);
            }}
            onDragLeave={() => setArchivoDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArchivoDragOver(false);
              setArchivoEntrega(e.dataTransfer.files?.[0] || null);
            }}
            onClick={() => document.getElementById("archivoEntregaInput")?.click()}
            className={`${dropZoneClass(archivoDragOver)} p-8 flex flex-col items-center justify-center text-center`}
          >
            <span className="material-symbols-outlined text-[40px] text-outline mb-2">cloud_upload</span>
            {/* Mismos textos que la zona de archivo de ProductForm */}
            <p className="font-semibold text-on-surface mb-1">
              {archivoEntrega
                ? archivoEntrega.name
                : yaTieneEntrega
                ? t("productForm.dropReplace")
                : t("productForm.dropNew")}
            </p>
            <p className="text-on-surface-variant text-xs font-mono">{t("productForm.supportedFormats")}</p>
            {yaTieneEntrega && !archivoEntrega && (
              <p className="text-on-surface-variant text-xs mt-2">
                {t("completarComisionModal.keepCurrentFile", { name: nombreDeArchivo(item.data.archivo_entrega) })}
              </p>
            )}
            <input
              id="archivoEntregaInput"
              type="file"
              className="hidden"
              onChange={(e) => setArchivoEntrega(e.target.files?.[0] || null)}
            />
          </div>

          {/* ---- Datos para la tienda (reventa): mismos campos que un producto ---- */}
          <div>
            <label className={labelClass}>{t("productForm.titleLabel")}</label>
            <input
              maxLength={200}
              placeholder={t("productForm.titlePlaceholder")}
              className={`${inputClass} ${erroresCampos.titulo ? inputErrorClass : ""}`}
              value={form.titulo}
              onChange={(e) => actualizarForm({ titulo: e.target.value })}
            />
            <ErrorCampo mensaje={erroresCampos.titulo} />
          </div>

          <div>
            <label className={labelClass}>{t("productForm.descriptionLabel")}</label>
            <textarea
              rows={4}
              placeholder={t("productForm.descriptionPlaceholder")}
              className={`${inputClass} resize-y ${erroresCampos.descripcion ? inputErrorClass : ""}`}
              value={form.descripcion}
              onChange={(e) => actualizarForm({ descripcion: e.target.value })}
            />
            <ErrorCampo mensaje={erroresCampos.descripcion} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>{t("completarComisionModal.resalePrice")}</label>
              {/* type="text" + inputMode="decimal" (no type="number"): así
                  una coma o un "$" no se descartan en silencio — llegan al
                  estado y se avisa con un error claro debajo del campo. */}
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                className={`${inputClass} ${erroresCampos.precio ? inputErrorClass : ""}`}
                value={form.precio}
                onChange={(e) => actualizarForm({ precio: e.target.value })}
              />
              <ErrorCampo mensaje={erroresCampos.precio} />
            </div>
            <div>
              <label className={labelClass}>{t("productForm.formatLabel")}</label>
              <input
                maxLength={50}
                placeholder={t("productForm.formatPlaceholder")}
                className={`${inputClass} ${erroresCampos.formato ? inputErrorClass : ""}`}
                value={form.formato}
                onChange={(e) => actualizarForm({ formato: e.target.value })}
              />
              <ErrorCampo mensaje={erroresCampos.formato} />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t("productForm.categoryLabel")}</label>
            <div className="flex flex-wrap gap-2">
              {categorias.map((categoria) => {
                const seleccionada = categoriaIds.includes(categoria.id);
                return (
                  <Pildora
                    key={categoria.id}
                    activa={seleccionada}
                    onClick={() =>
                      setCategoriaIds(
                        seleccionada
                          ? categoriaIds.filter((id) => id !== categoria.id)
                          : [...categoriaIds, categoria.id]
                      )
                    }
                  >
                    {nombreCategoria(categoria, i18n.language)}
                  </Pildora>
                );
              })}
            </div>
            {categoriaIds.length === 0 && (
              <p className="text-on-surface-variant text-xs mt-2">{t("productForm.categoryPlaceholder")}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              {t("productForm.youtubeLabel")}{" "}
              <span className="normal-case font-normal text-outline">{t("motionForm.optional")}</span>
            </label>
            {/* type="text" (no type="url"): el navegador bloquearía en
                silencio un link pegado sin "https://", que el backend sí
                acepta y normaliza. */}
            <input
              type="text"
              inputMode="url"
              maxLength={500}
              placeholder="https://www.youtube.com/watch?v=..."
              className={`${inputClass} ${erroresCampos.linkYoutube ? inputErrorClass : ""}`}
              value={form.linkYoutube}
              onChange={(e) => actualizarForm({ linkYoutube: e.target.value })}
            />
            <ErrorCampo mensaje={erroresCampos.linkYoutube} />
            <p className="text-on-surface-variant text-xs mt-1">{t("completarComisionModal.videoHelp")}</p>
          </div>

          {/* Foto del resultado = imagen de portada del producto (misma posición
              y misma zona que la imagen de previsualización en ProductForm) */}
          <div>
            <label className={labelClass}>{t("completarComisionModal.photoLabel")}</label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setFotoDragOver(true);
              }}
              onDragLeave={() => setFotoDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setFotoDragOver(false);
                setFotoEntrega(e.dataTransfer.files?.[0] || null);
              }}
              onClick={() => document.getElementById("fotoEntregaInput")?.click()}
              className={`${dropZoneClass(fotoDragOver)} p-4 flex items-center gap-4`}
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
              <div>
                <p className="font-semibold text-on-surface mb-1">
                  {fotoEntrega
                    ? fotoEntrega.name
                    : yaTieneEntrega
                    ? t("completarComisionModal.keepCurrentPhoto")
                    : t("completarComisionModal.photoNone")}
                </p>
                <p className="text-on-surface-variant text-xs font-mono">{t("productForm.imageFormats")}</p>
              </div>
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

          {/* Publicar al guardar — en el lugar del checkbox "Producto activo" de ProductForm */}
          {yaPublicado ? (
            <p className="text-on-surface-variant text-xs flex items-center gap-1.5 bg-surface-container-low rounded-lg p-3">
              <span className="material-symbols-outlined text-[16px] text-primary-fixed-dim">check_circle</span>
              {t("completarComisionModal.alreadyPublished", { id: item.data.producto_publicado })}
            </p>
          ) : (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 rounded bg-surface-variant border-outline-variant text-primary focus:ring-primary"
                checked={publicarAhora}
                onChange={(e) => setPublicarAhora(e.target.checked)}
              />
              <span>
                <span className="block text-on-surface">{t("completarComisionModal.publishNow")}</span>
                <span className="block text-on-surface-variant text-xs mt-0.5">{t("completarComisionModal.publishNowHelp")}</span>
              </span>
            </label>
          )}

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
