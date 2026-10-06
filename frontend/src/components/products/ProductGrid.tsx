import React from "react";
import type { Producto } from "../../api/productos.api";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  productos: Producto[];
  // true solo si además de tener sesión, puede ver/comprar el catálogo.
  hasAccess: boolean;
  // ids de productos que el usuario ya adquirió / guardó como favorito.
  purchasedIds?: ReadonlySet<number>;
  favoritoIds?: ReadonlySet<number>;
  onSelectProducto?: (producto: Producto) => void;
  onAddToCart?: (producto: Producto) => void;
  // Canje directo con MimiCoins (ver ProductCard).
  onCanjear?: (producto: Producto) => void;
  onGoToLibrary?: (producto: Producto) => void;
  // Sin esta acción las tarjetas no muestran el corazón.
  onToggleFavorito?: (producto: Producto) => void;
  // Botón de todas las tarjetas (ver ProductCard.accion). Sin valor, cada
  // tarjeta decide por su producto.
  accion?: "carrito" | "canje";
}

// La grilla de tarjetas de producto, sin saber de dónde salen los productos:
// la usan el catálogo (ProductList, con sus filtros y búsqueda) y la página
// de Favoritos, para que una tarjeta se vea y se comporte igual en ambos.
export const ProductGrid: React.FC<ProductGridProps> = ({
  productos,
  hasAccess,
  purchasedIds,
  favoritoIds,
  onSelectProducto,
  onAddToCart,
  onCanjear,
  onGoToLibrary,
  onToggleFavorito,
  accion,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {productos.map((prod) => {
      const tieneId = typeof prod.id === "number";
      return (
        <ProductCard
          key={prod.id || prod.titulo}
          producto={prod}
          hasAccess={hasAccess}
          isPurchased={tieneId && (purchasedIds?.has(prod.id as number) ?? false)}
          isFavorito={tieneId && (favoritoIds?.has(prod.id as number) ?? false)}
          onSelect={onSelectProducto}
          onAddToCart={onAddToCart}
          onCanjear={onCanjear}
          onGoToLibrary={onGoToLibrary}
          onToggleFavorito={onToggleFavorito}
          accion={accion}
        />
      );
    })}
  </div>
);
