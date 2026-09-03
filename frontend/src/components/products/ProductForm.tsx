import React, { useEffect, useState } from "react";
import type { Producto } from "../../api/productos.api";
import { createProducto, patchProducto } from "../../api/productos.api";

interface ProductFormProps {
  open: boolean;
  producto?: Producto | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm = {
  titulo: "",
  descripcion: "",
  precio: "",
  formato_archivo: "",
  link_youtube: "",
  activo: true,
};

export const ProductForm: React.FC<ProductFormProps> = ({
  open,
  producto,
  onClose,
  onSaved,
}) => {
  const isEdit = Boolean(producto?.id);
  const [form, setForm] = useState(emptyForm);
  const [archivo3d, setArchivo3d] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [imagenPrevia, setImagenPrevia] = useState<File | null>(null);
  const [imagenPreviaUrl, setImagenPreviaUrl] = useState<string>("");
  const [imagenDragOver, setImagenDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (producto) {
      setForm({
        titulo: producto.titulo || "",
        descripcion: producto.descripcion || "",
        precio: String(producto.precio ?? ""),
        formato_archivo: producto.formato_archivo || "",
        link_youtube: producto.link_youtube || "",
        activo: producto.activo ?? true,
      });
      setImagenPreviaUrl(
        typeof producto.imagen_previa === "string" ? producto.imagen_previa : ""
      );
    } else {
      setForm(emptyForm);
      setImagenPreviaUrl("");
    }
    setArchivo3d(null);
    setImagenPrevia(null);
    setError(null);
  }, [producto, open]);

  // Genera y limpia la vista previa local del archivo de imagen seleccionado.
  useEffect(() => {
    if (!imagenPrevia) return;
    const objectUrl = URL.createObjectURL(imagenPrevia);
    setImagenPreviaUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imagenPrevia]);

  if (!open) return null;

  const handleFile = (file: File | null) => {
    if (file) setArchivo3d(file);
  };

  const handleImagenFile = (file: File | null) => {
    if (file) setImagenPrevia(file);
  };

  const buildFormData = () => {
    const data = new FormData();
    data.append("titulo", form.titulo);
    data.append("descripcion", form.descripcion);
    data.append("precio", form.precio);
    data.append("formato_archivo", form.formato_archivo);
    data.append("link_youtube", form.link_youtube);
    data.append("activo", String(form.activo));
    if (archivo3d) {
      data.append("archivo_3d", archivo3d);
    }
    if (imagenPrevia) {
      data.append("imagen_previa", imagenPrevia);
    }
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isEdit && !archivo3d) {
      setError("Debes adjuntar el archivo 3D del modelo.");
      return;
    }

    setSaving(true);
    try {
      const data = buildFormData();
      if (isEdit && producto?.id) {
        await patchProducto(producto.id, data);
      } else {
        await createProducto(data);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error("Error al guardar el producto:", err);
      setError("No se pudo guardar el producto. Revisa los datos e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="glass-panel relative w-full max-w-2xl rounded-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto bg-surface-container-lowest/95">
        <button
          type="button"
          className="absolute top-6 right-6 text-on-surface-variant hover:text-primary transition-colors"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="text-2xl font-bold text-on-surface mb-2">
          {isEdit ? "Editar Producto" : "Nuevo Producto"}
        </h2>
        <p className="text-on-surface-variant mb-6">
          {isEdit
            ? "Actualiza los datos del modelo 3D."
            : "Sube el archivo y define los datos del modelo para el catálogo."}
        </p>

        {error && (
          <div className="bg-error/20 border border-error text-on-error-container p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Zona de archivo */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0] || null);
            }}
            onClick={() => document.getElementById("archivo3dInput")?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragOver
                ? "border-primary bg-primary-container/10"
                : "border-outline-variant/50 hover:border-primary/50 hover:bg-surface-variant/20"
            }`}
          >
            <span className="material-symbols-outlined text-[40px] text-outline mb-2">
              cloud_upload
            </span>
            <p className="font-semibold text-on-surface mb-1">
              {archivo3d
                ? archivo3d.name
                : isEdit
                ? "Arrastra un archivo para reemplazar el actual"
                : "Arrastra y suelta el archivo 3D aquí"}
            </p>
            <p className="text-on-surface-variant text-xs font-mono">
              Formatos soportados: STL, OBJ, FBX...
            </p>
            <input
              id="archivo3dInput"
              type="file"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
              Título
            </label>
            <input
              required
              className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner"
              placeholder="Ej. Kit Modular Cyberpunk"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
              Descripción
            </label>
            <textarea
              required
              rows={4}
              className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner resize-y"
              placeholder="Describe la geometría, el nivel de detalle y el uso previsto..."
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
                Precio (USD)
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner"
                placeholder="0.00"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
                Formato de archivo
              </label>
              <input
                required
                className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner"
                placeholder="STL, OBJ, FBX..."
                value={form.formato_archivo}
                onChange={(e) =>
                  setForm({ ...form, formato_archivo: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
              Video de YouTube <span className="normal-case font-normal text-outline">(opcional)</span>
            </label>
            <input
              type="url"
              className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner"
              placeholder="https://www.youtube.com/watch?v=..."
              value={form.link_youtube}
              onChange={(e) => setForm({ ...form, link_youtube: e.target.value })}
            />
            <p className="text-on-surface-variant text-xs mt-1">
              Se muestra como video de vista previa en el detalle del producto.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
              Imagen de previsualización
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setImagenDragOver(true);
              }}
              onDragLeave={() => setImagenDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setImagenDragOver(false);
                handleImagenFile(e.dataTransfer.files?.[0] || null);
              }}
              onClick={() => document.getElementById("imagenPreviaInput")?.click()}
              className={`border-2 border-dashed rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all ${
                imagenDragOver
                  ? "border-primary bg-primary-container/10"
                  : "border-outline-variant/50 hover:border-primary/50 hover:bg-surface-variant/20"
              }`}
            >
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-container-lowest border border-outline-variant/30 shrink-0 flex items-center justify-center">
                {imagenPreviaUrl ? (
                  <img
                    src={imagenPreviaUrl}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined text-outline">image</span>
                )}
              </div>
              <div>
                <p className="font-semibold text-on-surface mb-1">
                  {imagenPrevia
                    ? imagenPrevia.name
                    : imagenPreviaUrl
                    ? "Haz clic o arrastra para reemplazar la imagen"
                    : "Haz clic o arrastra una imagen aquí"}
                </p>
                <p className="text-on-surface-variant text-xs font-mono">
                  PNG, JPG o WebP
                </p>
              </div>
              <input
                id="imagenPreviaInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImagenFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded bg-surface-variant border-outline-variant text-primary focus:ring-primary"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            <span className="text-on-surface">Producto activo (visible en el catálogo)</span>
          </label>

          <div className="flex justify-end gap-4 pt-4 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-2.5 px-8 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isEdit ? "save" : "rocket_launch"}
              </span>
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Publicar producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
