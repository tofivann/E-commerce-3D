import React, { useEffect, useState } from "react";
import type { ComisionModeloAdmin } from "../../api/comisiones.api";
import { comisionesAdminApi } from "../../api/comisiones.api";

interface PublicarProductoModalProps {
  comision: ComisionModeloAdmin | null;
  onClose: () => void;
  onPublicado: () => void;
}

const emptyForm = { titulo: "", descripcion: "", precio: "", formato_archivo: "" };

export const PublicarProductoModal: React.FC<PublicarProductoModalProps> = ({
  comision,
  onClose,
  onPublicado,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [imagenPrevia, setImagenPrevia] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (comision) {
      setForm({
        titulo: `${comision.nombre_personaje} (${comision.juego.nombre})`,
        descripcion: "",
        precio: "",
        formato_archivo: "",
      });
      setImagenPrevia(null);
      setError(null);
    }
  }, [comision]);

  if (!comision) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await comisionesAdminApi.publicarComisionModelo(comision.id, {
        titulo: form.titulo,
        descripcion: form.descripcion,
        precio: form.precio,
        formato_archivo: form.formato_archivo,
        imagen_previa: imagenPrevia || undefined,
      });
      onPublicado();
    } catch (err) {
      console.error("Error al publicar el producto:", err);
      setError("No se pudo publicar el producto. Revisa los datos e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel relative w-full max-w-lg rounded-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto bg-surface-container-lowest/95">
        <button
          type="button"
          className="absolute top-6 right-6 text-on-surface-variant hover:text-primary transition-colors"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="text-2xl font-bold text-on-surface mb-2">Publicar a la Tienda</h2>
        <p className="text-on-surface-variant mb-6 text-sm">
          Se creará un producto nuevo en el catálogo usando el archivo de entrega ya subido para "
          {comision.nombre_personaje}".
        </p>

        {error && (
          <div className="bg-error/20 border border-error text-on-error-container p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
              Título
            </label>
            <input
              required
              className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
              rows={3}
              className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-y"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
                Precio de reventa (USD)
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
                Formato
              </label>
              <input
                required
                placeholder="STL, OBJ, FBX..."
                className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={form.formato_archivo}
                onChange={(e) => setForm({ ...form, formato_archivo: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
              Imagen de portada <span className="normal-case font-normal text-outline">(opcional, usa la foto de referencia si se omite)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImagenPrevia(e.target.files?.[0] || null)}
              className="w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-container file:text-on-primary-fixed file:font-semibold file:cursor-pointer cursor-pointer"
            />
          </div>

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
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              {saving ? "Publicando..." : "Publicar Producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
