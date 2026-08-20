import React, { useEffect, useState } from "react";
import type { Producto } from "../../api/productos.api";
import { deleteProducto, getAllProductos } from "../../api/productos.api";
import { ProductForm } from "./ProductForm";

export const ProductAdminTable: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const response = await getAllProductos();
      setProductos(response.data);
      setError(null);
    } catch (err) {
      console.error("Error al cargar productos:", err);
      setError("No se pudieron cargar los productos del servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleDelete = async (producto: Producto) => {
    if (!producto.id) return;
    if (!window.confirm(`¿Eliminar "${producto.titulo}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    setDeletingId(producto.id);
    try {
      await deleteProducto(producto.id);
      setProductos((prev) => prev.filter((p) => p.id !== producto.id));
    } catch (err) {
      console.error("Error al eliminar el producto:", err);
      window.alert("No se pudo eliminar el producto.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-on-surface mb-1">Productos</h2>
          <p className="text-on-surface-variant text-sm">Edita o elimina los modelos publicados en el catálogo.</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-2 px-4 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nuevo
        </button>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-error/20 border border-error/50 rounded-md text-on-error-container text-center">
          {error}
        </div>
      )}

      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high/60 border-b border-outline-variant/30">
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Producto</th>
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Formato</th>
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Precio</th>
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Estado</th>
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                    Cargando productos...
                  </td>
                </tr>
              )}

              {!loading && productos.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                    No hay productos registrados.
                  </td>
                </tr>
              )}

              {!loading &&
                productos.map((producto) => (
                  <tr key={producto.id} className="hover:bg-surface-container-highest/30 transition-colors group">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md overflow-hidden border border-outline-variant/30 bg-surface-container-lowest shrink-0">
                          {typeof producto.imagen_previa === "string" && producto.imagen_previa ? (
                            <img
                              src={producto.imagen_previa}
                              alt={producto.titulo}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-outline">
                              <span className="material-symbols-outlined text-[18px]">deployed_code</span>
                            </div>
                          )}
                        </div>
                        <span className="text-on-surface font-medium truncate max-w-[220px]">{producto.titulo}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 font-mono text-on-surface-variant text-sm">
                      {producto.formato_archivo || "—"}
                    </td>
                    <td className="py-3 px-6 font-mono text-primary-fixed-dim font-semibold">
                      ${Number(producto.precio).toFixed(2)}
                    </td>
                    <td className="py-3 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          producto.activo ? "text-primary-fixed-dim" : "text-on-surface-variant"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            producto.activo ? "bg-primary-fixed-dim" : "bg-outline-variant"
                          }`}
                        />
                        {producto.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          aria-label="Editar"
                          onClick={() => {
                            setEditing(producto);
                            setFormOpen(true);
                          }}
                          className="p-1.5 rounded border border-outline-variant/40 text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          aria-label="Eliminar"
                          disabled={deletingId === producto.id}
                          onClick={() => handleDelete(producto)}
                          className="p-1.5 rounded border border-outline-variant/40 text-on-surface-variant hover:text-error hover:border-error/50 transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <ProductForm
        open={formOpen}
        producto={editing}
        onClose={() => setFormOpen(false)}
        onSaved={fetchProductos}
      />
    </div>
  );
};
