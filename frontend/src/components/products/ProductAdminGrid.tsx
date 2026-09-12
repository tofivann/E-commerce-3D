import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Producto, Categoria } from "../../api/productos.api";
import { getAllProductosAdmin, patchProducto, categoriasApi } from "../../api/productos.api";
import { ProductForm } from "./ProductForm";
import { nombreCategoria } from "../../utils/categoria";

export const ProductAdminGrid: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const toggleCategoria = (id: number) => {
    setCategoriasSeleccionadas((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const productosFiltrados = productos.filter(
    (p) => categoriasSeleccionadas.size === 0 || categoriasSeleccionadas.has(p.categoria)
  );

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const response = await getAllProductosAdmin();
      setProductos(response.data);
      setError(null);
    } catch (err) {
      console.error("Error al cargar productos:", err);
      setError(t("adminProducts.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
    categoriasApi
      .listar()
      .then(setCategorias)
      .catch((err) => console.error("Error al cargar categorías:", err));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (producto: Producto) => {
    setEditing(producto);
    setFormOpen(true);
  };

  const handleToggleActivo = async (producto: Producto) => {
    if (!producto.id) return;
    setTogglingId(producto.id);
    try {
      await patchProducto(producto.id, { activo: !producto.activo });
      setProductos((prev) =>
        prev.map((p) => (p.id === producto.id ? { ...p, activo: !p.activo } : p))
      );
    } catch (err) {
      console.error("Error al cambiar el estado del producto:", err);
      window.alert(t("adminProducts.toggleError"));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface mb-1">{t("adminProducts.gridTitle")}</h1>
          <p className="text-on-surface-variant">{t("adminProducts.gridSubtitle")}</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-2.5 px-5 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {t("adminProducts.addProduct")}
        </button>
      </div>

      {categorias.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setCategoriasSeleccionadas(new Set())}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              categoriasSeleccionadas.size === 0
                ? "bg-primary-container text-on-primary-fixed border-primary-container"
                : "bg-transparent text-on-surface-variant border-outline-variant/50 hover:border-primary/50"
            }`}
          >
            {t("catalog.allCategories")}
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCategoria(cat.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                categoriasSeleccionadas.has(cat.id)
                  ? "bg-primary-container text-on-primary-fixed border-primary-container"
                  : "bg-transparent text-on-surface-variant border-outline-variant/50 hover:border-primary/50"
              }`}
            >
              {nombreCategoria(cat, i18n.language)}
            </button>
          ))}
        </div>
      )}

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

      {!loading && !error && productosFiltrados.length === 0 && (
        <div className="p-10 text-center text-on-surface-variant glass-panel rounded-xl">
          {t("adminProducts.emptyGrid")}
        </div>
      )}

      {!loading && !error && productosFiltrados.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productosFiltrados.map((producto) => (
            <div
              key={producto.id}
              className="group bg-surface-container-high rounded-xl overflow-hidden border border-outline-variant/30 relative flex flex-col h-[320px] transition-all hover:-translate-y-1"
            >
              <div className="absolute top-3 right-3 z-20 flex gap-2">
                <span className="bg-surface/80 backdrop-blur-md text-primary font-mono text-[10px] px-2 py-1 rounded-full border border-primary/30">
                  .{producto.formato_archivo || "3D"}
                </span>
                <button
                  onClick={() => handleToggleActivo(producto)}
                  disabled={togglingId === producto.id}
                  title={t("adminProducts.toggleTitle")}
                  className={`backdrop-blur-md font-mono text-[10px] px-2 py-1 rounded-full border transition-colors disabled:opacity-50 ${
                    producto.activo
                      ? "bg-surface/80 text-primary-fixed-dim border-primary/30 hover:bg-surface"
                      : "bg-surface/80 text-error border-error/30 hover:bg-surface"
                  }`}
                >
                  {producto.activo ? t("adminProducts.active") : t("adminProducts.inactive")}
                </button>
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
                {producto.categoria_detalle && (
                  <span className="inline-flex items-center gap-1 self-start text-[10px] font-semibold uppercase tracking-wide text-primary-fixed-dim mb-1">
                    <span className="material-symbols-outlined text-[12px]">sell</span>
                    {nombreCategoria(producto.categoria_detalle, i18n.language)}
                  </span>
                )}
                <p className="text-on-surface-variant text-sm mb-3 truncate">
                  {producto.descripcion || t("adminProducts.defaultDescription")}
                </p>
                <div className="mt-auto flex justify-between items-center">
                  <span className="font-mono text-primary-fixed-dim font-bold">
                    ${Number(producto.precio).toFixed(2)}
                  </span>
                  <button
                    aria-label={t("adminProducts.editProduct")}
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
