import React, { useEffect, useState } from "react";
import type { Producto } from "../../api/productos.api";
import { getAllProductos } from "../../api/productos.api";
import { ProductForm } from "./ProductForm";

export const ProductAdminGrid: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);

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

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (producto: Producto) => {
    setEditing(producto);
    setFormOpen(true);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface mb-1">Catálogo de Productos</h1>
          <p className="text-on-surface-variant">Gestiona los modelos 3D disponibles en la tienda.</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-2.5 px-5 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Añadir producto
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-[320px] rounded-xl bg-surface-container-low animate-pulse border border-outline-variant/20"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-error/20 border border-error/50 rounded-md text-on-error-container text-center">
          {error}
        </div>
      )}

      {!loading && !error && productos.length === 0 && (
        <div className="p-10 text-center text-on-surface-variant glass-panel rounded-xl">
          Aún no has agregado ningún producto.
        </div>
      )}

      {!loading && !error && productos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productos.map((producto) => (
            <div
              key={producto.id}
              className="group bg-surface-container-high rounded-xl overflow-hidden border border-outline-variant/30 relative flex flex-col h-[320px] transition-all hover:-translate-y-1"
            >
              <div className="absolute top-3 right-3 z-10 flex gap-2">
                <span className="bg-surface/80 backdrop-blur-md text-primary font-mono text-[10px] px-2 py-1 rounded-full border border-primary/30">
                  .{producto.formato_archivo || "3D"}
                </span>
                {!producto.activo && (
                  <span className="bg-surface/80 backdrop-blur-md text-error font-mono text-[10px] px-2 py-1 rounded-full border border-error/30">
                    Inactivo
                  </span>
                )}
              </div>

              <div className="h-48 w-full overflow-hidden bg-surface-container-lowest relative">
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high to-transparent z-10 opacity-60" />
                <img
                  alt={producto.titulo}
                  src={
                    typeof producto.imagen_previa === "string" && producto.imagen_previa
                      ? producto.imagen_previa
                      : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80"
                  }
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="p-4 flex flex-col flex-1 relative z-20 -mt-8 glass-panel rounded-t-xl mx-2 mb-2">
                <h3 className="font-semibold text-on-surface leading-tight mb-1 truncate">
                  {producto.titulo}
                </h3>
                <p className="text-on-surface-variant text-sm mb-3 truncate">
                  {producto.descripcion || "Modelo 3D"}
                </p>
                <div className="mt-auto flex justify-between items-center">
                  <span className="font-mono text-primary-fixed-dim font-bold">
                    ${Number(producto.precio).toFixed(2)}
                  </span>
                  <button
                    aria-label="Editar producto"
                    onClick={() => openEdit(producto)}
                    className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductForm
        open={formOpen}
        producto={editing}
        onClose={() => setFormOpen(false)}
        onSaved={fetchProductos}
      />
    </div>
  );
};
