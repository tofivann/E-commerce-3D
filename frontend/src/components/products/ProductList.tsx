import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { categoriasApi } from "../../api/productos.api";
import type { Producto, Categoria, Tienda } from "../../api/productos.api";
import { FiltroChips } from "../ui/FiltroChips";
import { accionDeTienda, conTienda, leerTienda } from "../../utils/tienda";
import { ProductGrid } from "./ProductGrid";
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
  purchasedIds?: ReadonlySet<number>;
  // ids de productos que el usuario guardó como favoritos.
  favoritoIds?: ReadonlySet<number>;
  onSelectProducto?: (producto: Producto) => void;
  onAddToCart?: (producto: Producto) => void;
  // Canje directo con MimiCoins: la acción de la Tienda MimiCoins.
  onCanjear?: (producto: Producto) => void;
  onGoToLibrary?: (producto: Producto) => void;
  onToggleFavorito?: (producto: Producto) => void;
  searchQuery?: string;
}


export const ProductList: React.FC<ProductListProps> = ({
  hasAccess,
  purchasedIds,
  favoritoIds,
  onSelectProducto,
  onAddToCart,
  onCanjear,
  onGoToLibrary,
  onToggleFavorito,
  searchQuery = "",
}) => {
  const { t } = useTranslation();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<Set<number>>(new Set());
  // La tienda elegida vive en la URL (utils/tienda.ts).
  const [searchParams, setSearchParams] = useSearchParams();
  const tienda = leerTienda(searchParams);
  const cambiarTienda = (nueva: Tienda) => setSearchParams(conTienda(searchParams, nueva), { replace: true });

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
    tienda,
  });

  useEffect(() => {
    categoriasApi
      .listar()
      .then(setCategorias)
      .catch((err) => console.error("Error al cargar categorías:", err));
  }, []);

  const hayFiltros = busqueda !== "" || categoriasSeleccionadas.size > 0;
  // Sin filtros, la tienda normal nunca está vacía (si lo está es un fallo
  // de carga); la Tienda MimiCoins sí puede estarlo, y se dice.
  const sinResultados = !cargando && !error && productos.length === 0 && (hayFiltros || tienda === "monedas");

  return (
    <section className="flex flex-col gap-6 w-full">
      {/* Encabezado del Catálogo */}
      <div className="flex justify-between items-end border-b border-[var(--color-outline-variant)]/20 pb-4">
        <h2 className="text-2xl font-bold text-[var(--color-on-surface)]">
          {tienda === "monedas" ? t("catalog.titleMimiCoins") : t("catalog.title")}
        </h2>
        <div className="flex gap-2">
          <span className="font-mono text-xs text-[var(--color-outline)] bg-[var(--color-surface-container-low)] px-3 py-1 rounded-full border border-[var(--color-outline-variant)]/30">
            {hasAccess ? t("catalog.active") : t("catalog.preview")}
          </span>
        </div>
      </div>

      {/* Qué tienda: la normal (se compra con dinero) o la Tienda MimiCoins
          (se canjea con MimiCoins). Un producto puede estar en las dos. */}
      <FiltroChips<Tienda>
        opciones={[
          { valor: "dinero", etiqueta: t("catalog.storeMoney") },
          { valor: "monedas", etiqueta: t("catalog.storeMimiCoins") },
        ]}
        seleccionado={tienda}
        onChange={cambiarTienda}
        titulo={t("catalog.storeLabel")}
      />
      {tienda === "monedas" && <p className="text-on-surface-variant text-sm -mt-2">{t("catalog.storeMimiCoinsHelp")}</p>}

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
            : hayFiltros
            ? t("catalog.noResultsFilters")
            : t("catalog.storeMimiCoinsEmpty")}
        </div>
      )}

      {/* Grilla de Productos */}
      {productos.length > 0 && (
        <ProductGrid
          productos={productos}
          hasAccess={hasAccess}
          purchasedIds={purchasedIds}
          favoritoIds={favoritoIds}
          onSelectProducto={onSelectProducto}
          onAddToCart={onAddToCart}
          onCanjear={onCanjear}
          onGoToLibrary={onGoToLibrary}
          onToggleFavorito={onToggleFavorito}
          accion={accionDeTienda(tienda)}
        />
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
