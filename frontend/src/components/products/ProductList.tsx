import React, { useEffect, useState } from "react";
import { getAllProductos } from "../../api/productos.api";
import type { Producto } from "../../api/productos.api";
import { ProductCard } from "./ProductCard";
import { coincideBusqueda } from "../../utils/normalizarTexto";

interface ProductListProps {
  isLoggedIn: boolean;
  // true solo si además de tener sesión, puede ver/comprar el catálogo
  // (suscripción activa, o administrador).
  hasAccess: boolean;
  // ids de productos que el usuario ya adquirió (están en su biblioteca digital).
  purchasedIds?: Set<number>;
  onSelectProducto?: (producto: Producto) => void;
  onAddToCart?: (producto: Producto) => void;
  onGoToLibrary?: (producto: Producto) => void;
  searchQuery?: string;
}

export const ProductList: React.FC<ProductListProps> = ({
  isLoggedIn,
  hasAccess,
  purchasedIds,
  onSelectProducto,
  onAddToCart,
  onGoToLibrary,
  searchQuery = "",
}) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const productosFiltrados = productos.filter(
    (p) =>
      coincideBusqueda(p.titulo, searchQuery) ||
      coincideBusqueda(p.descripcion, searchQuery)
  );

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const response = await getAllProductos();
      setProductos(response.data);
    } catch (err) {
      console.error("Error al cargar productos:", err);
      setError("No se pudieron cargar los productos del servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex flex-col gap-6 w-full">
      {/* Encabezado del Catálogo */}
      <div className="flex justify-between items-end border-b border-[var(--color-outline-variant)]/20 pb-4">
        <h2 className="text-2xl font-bold text-[var(--color-on-surface)]">
          Explorar Modelos Destacados
        </h2>
        <div className="flex gap-2">
          <span className="font-mono text-xs text-[var(--color-outline)] bg-[var(--color-surface-container-low)] px-3 py-1 rounded-full border border-[var(--color-outline-variant)]/30">
            {hasAccess ? "Catálogo Activo" : "Mostrando vista previa"}
          </span>
        </div>
      </div>

      {/* Estado de Carga */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-[320px] rounded-lg bg-[var(--color-surface-container-low)] animate-pulse border border-[var(--color-outline-variant)]/20"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-error/20 border border-error/50 rounded-md text-on-error-container text-center">
          {error}
        </div>
      )}

      {/* Sin resultados de búsqueda */}
      {!loading && !error && productos.length > 0 && productosFiltrados.length === 0 && (
        <div className="p-10 text-center text-on-surface-variant">
          No encontramos modelos que coincidan con "{searchQuery}".
        </div>
      )}

      {/* Grilla de Productos */}
      {!loading && !error && productosFiltrados.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productosFiltrados.map((prod) => (
            <ProductCard
              key={prod.id || prod.titulo}
              producto={prod}
              isLoggedIn={isLoggedIn}
              hasAccess={hasAccess}
              isPurchased={typeof prod.id === "number" && (purchasedIds?.has(prod.id) ?? false)}
              onSelect={onSelectProducto}
              onAddToCart={onAddToCart}
              onGoToLibrary={onGoToLibrary}
            />
          ))}
        </div>
      )}

      <div className="flex justify-center mt-6">
        <button className="bg-transparent border border-[var(--color-outline-variant)]/50 text-[var(--color-on-surface)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary-container)]/50 btn-glow-inner rounded px-6 py-2 transition-all active:scale-95 glass-panel">
          Ver Catálogo Completo
        </button>
      </div>
    </section>
  );
};
