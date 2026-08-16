import React from "react";
import type { Producto } from "../../api/productos.api";

interface ProductCardProps {
  producto: Producto;
  isLoggedIn: boolean;
  onSelect?: (producto: Producto) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  producto,
  isLoggedIn,
  onSelect,
}) => {
  const fallbackImage =
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";

  return (
    <article
      onClick={() => isLoggedIn && onSelect && onSelect(producto)}
      className={`bg-surface-container-low rounded-lg border border-outline-variant/30 overflow-hidden flex flex-col relative group card-hover transition-all duration-300 h-80 ${
        isLoggedIn ? "cursor-pointer" : ""
      }`}
    >
      {/* Zona de Imagen */}
      <div className="relative grow h-48 overflow-hidden bg-surface-container-lowest">
        <img
          alt={producto.titulo}
          src={producto.imagen_previa || fallbackImage}
          className="object-cover w-full h-full transition-transform duration-500"
        />

        {/* Overlay de Bloqueo para Invitados */}
        {!isLoggedIn && (
          <div className="absolute inset-0 bg-background/40 backdrop-blur-md flex flex-col items-center justify-center gap-2 opacity-100 group-hover:bg-background/60 transition-all z-10">
            <span className="material-symbols-outlined text-primary-container text-[40px] drop-shadow-lg">
              lock
            </span>
            <span className="text-xs text-on-surface tracking-wider bg-surface/80 px-3 py-1 rounded-full backdrop-blur-sm border border-outline-variant/50 font-semibold">
              Regístrate para descubrir
            </span>
          </div>
        )}
      </div>

      {/* Pie de la Tarjeta */}
      <div className="p-4 glass-panel border-t-0 flex flex-col gap-1 relative z-20">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-on-surface truncate pr-2">
            {producto.titulo}
          </h3>
          <span className="font-mono text-on-secondary-container border border-secondary-container/50 px-2 rounded-full text-[10px] uppercase">
            .{producto.formato_archivo || "3D"}
          </span>
        </div>

        <p className="font-mono text-on-surface-variant text-sm truncate">
          {producto.descripcion || "Modelo MMD 3D"}
        </p>

        {/* Precio o barra de carga de invitado */}
        {isLoggedIn ? (
          <div className="mt-1 flex items-center justify-between">
            <span className="text-primary-container font-bold font-mono">
              ${Number(producto.precio).toFixed(2)}
            </span>
            <button className="text-xs bg-primary-container text-on-primary-fixed px-3 py-1 rounded hover:bg-primary-fixed-dim transition-colors font-semibold">
              Descargar
            </button>
          </div>
        ) : (
          <div className="h-6 w-1/3 bg-surface-container-highest rounded animate-pulse mt-1 opacity-20"></div>
        )}
      </div>
    </article>
  );
};
