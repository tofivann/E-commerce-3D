import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { categoriasApi } from "../../api/productos.api";
import type { Producto, Categoria } from "../../api/productos.api";
import { ProductCard } from "./ProductCard";
import { ProductGridSkeleton } from "./ProductGridSkeleton";
import { CategoryFilter } from "./CategoryFilter";
import { InfiniteScrollSentinel } from "../ui/InfiniteScrollSentinel";
import { useDebounce } from "../../hooks/useDebounce";
import { useProductosPaginados } from "../../hooks/useProductosPaginados";

interface ProductListProps {
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
  hasAccess,
  purchasedIds,
  onSelectProducto,
  onAddToCart,
  onGoToLibrary,
  searchQuery = "",
}) => {
  const { t } = useTranslation();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<Set<number>>(new Set());

  // La búsqueda y las categorías se resuelven en el backend (el cliente solo
  // tiene cargadas las páginas que ya pidió). El texto va con retraso para
  // no lanzar una petición por cada tecla.
  const busqueda = useDebounce(searchQuery.trim());
  const {
    items: productos,
    cargando,
    cargandoMas,
    error,
    hayMas,
    cargarMas,
  } = useProductosPaginados({
    search: busqueda,
    categorias: [...categoriasSeleccionadas],
  });

  useEffect(() => {
    categoriasApi
      .listar()
      .then(setCategorias)
      .catch((err) => console.error("Error al cargar categorías:", err));
  }, []);

  const hayFiltros = busqueda !== "" || categoriasSeleccionadas.size > 0;
  const sinResultados = !cargando && !error && productos.length === 0 && hayFiltros;

  return (
    <section className="flex flex-col gap-6 w-full">
      {/* Encabezado del Catálogo */}
      <div className="flex justify-between items-end border-b border-[var(--color-outline-variant)]/20 pb-4">
        <h2 className="text-2xl font-bold text-[var(--color-on-surface)]">
          {t("catalog.title")}
        </h2>
        <div className="flex gap-2">
          <span className="font-mono text-xs text-[var(--color-outline)] bg-[var(--color-surface-container-low)] px-3 py-1 rounded-full border border-[var(--color-outline-variant)]/30">
            {hasAccess ? t("catalog.active") : t("catalog.preview")}
          </span>
        </div>
      </div>

      {/* Filtro por categoría */}
      <CategoryFilter
        categorias={categorias}
        seleccionadas={categoriasSeleccionadas}
        onChange={setCategoriasSeleccionadas}
      />

      {/* Estado de Carga (primera página) */}
      {cargando && <ProductGridSkeleton />}

      {/* Error */}
      {error && (
        <div className="p-4 bg-error/20 border border-error/50 rounded-md text-on-error-container text-center">
          {t("catalog.loadError")}
        </div>
      )}

      {/* Sin resultados para la búsqueda / categorías */}
      {sinResultados && (
        <div className="p-10 text-center text-on-surface-variant">
          {busqueda
            ? t("catalog.noResults", { query: busqueda })
            : t("catalog.noResultsFilters")}
        </div>
      )}

      {/* Grilla de Productos */}
      {productos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productos.map((prod) => (
            <ProductCard
              key={prod.id || prod.titulo}
              producto={prod}
              hasAccess={hasAccess}
              isPurchased={typeof prod.id === "number" && (purchasedIds?.has(prod.id) ?? false)}
              onSelect={onSelectProducto}
              onAddToCart={onAddToCart}
              onGoToLibrary={onGoToLibrary}
            />
          ))}
        </div>
      )}

      {/* Scroll infinito: siguiente página al acercarse al final */}
      {cargandoMas && <ProductGridSkeleton />}
      <InfiniteScrollSentinel
        onVisible={cargarMas}
        disabled={!hayMas || cargando || cargandoMas}
      />
    </section>
  );
};
