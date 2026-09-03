import React from "react";
import type { Producto } from "../../api/productos.api";

interface ProductCardProps {
  producto: Producto;
  isLoggedIn: boolean;
  // true solo si además de tener sesión, puede ver/comprar el catálogo
  // (suscripción activa, o administrador).
  hasAccess: boolean;
  // true si el usuario ya adquirió este producto (está en su biblioteca digital).
  isPurchased?: boolean;
  onSelect?: (producto: Producto) => void;
  onAddToCart?: (producto: Producto) => void;
  onGoToLibrary?: (producto: Producto) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  producto,
  isLoggedIn,
  hasAccess,
  isPurchased = false,
  onSelect,
  onAddToCart,
  onGoToLibrary,
}) => {
  const fallbackImage =
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";

  const handleCardClick = () => {
    if (isPurchased) {
      onGoToLibrary && onGoToLibrary(producto);
      return;
    }
    // Ver el detalle no requiere suscripción, pero sí sesión iniciada:
    // los invitados no ven la ficha del producto, solo el catálogo bloqueado.
    isLoggedIn && onSelect && onSelect(producto);
  };

  return (
    <article
      onClick={handleCardClick}
      className={`bg-surface-container-low rounded-lg border border-outline-variant/30 overflow-hidden flex flex-col relative group card-hover transition-all duration-300 h-80 ${
        isLoggedIn || isPurchased ? "cursor-pointer" : ""
      }`}
    >
      {/* Zona de Imagen */}
      <div className="relative grow h-48 overflow-hidden bg-surface-container-lowest">
        <img
          alt={producto.titulo}
          src={
            typeof producto.imagen_previa === "string"
              ? producto.imagen_previa
              : fallbackImage
          }
          className="object-cover w-full h-full transition-transform duration-500"
        />

        {/* Insignia: ya adquirido, en la biblioteca digital */}
        {isPurchased && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-primary-container/95 text-on-primary-fixed text-[10px] font-semibold tracking-wide px-3 py-1 rounded-full shadow-md backdrop-blur-sm">
            <span className="material-symbols-outlined text-[14px]">folder_special</span>
            En tu biblioteca
          </div>
        )}

        {/* Overlay de Bloqueo: invitados, o logueados sin suscripción activa (no aplica si ya lo compró) */}
        {!hasAccess && !isPurchased && (
          <div className="absolute inset-0 bg-background/40 backdrop-blur-md flex flex-col items-center justify-center gap-2 opacity-100 group-hover:bg-background/60 transition-all z-10">
            <span className="material-symbols-outlined text-primary-container text-[40px] drop-shadow-lg">
              {isLoggedIn ? "workspace_premium" : "lock"}
            </span>
            <span className="text-xs text-on-surface tracking-wider bg-surface/80 px-4 py-1 rounded-full backdrop-blur-sm border border-outline-variant/50 font-semibold text-center">
              {isLoggedIn ? "Activa tu suscripción para desbloquear" : "Regístrate para descubrir"}
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

        {/* Precio + Agregar, acceso a biblioteca, o barra de carga de invitado/sin suscripción */}
        {isPurchased ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGoToLibrary && onGoToLibrary(producto);
            }}
            className="mt-1 w-full text-xs bg-transparent border border-primary-container text-primary-container px-3 py-1.5 rounded hover:bg-primary-container hover:text-on-primary-fixed transition-colors font-semibold flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">folder_special</span>
            Ir a mi biblioteca
          </button>
        ) : hasAccess ? (
          <div className="mt-1 flex items-center justify-between">
            <span className="text-primary-container font-bold font-mono">
              ${Number(producto.precio).toFixed(2)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart && onAddToCart(producto);
              }}
              className="text-xs bg-primary-container text-on-primary-fixed px-3 py-1 rounded hover:bg-primary-fixed-dim transition-colors font-semibold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
              Agregar
            </button>
          </div>
        ) : (
          <div className="h-6 w-1/3 bg-surface-container-highest rounded animate-pulse mt-1 opacity-20"></div>
        )}
      </div>
    </article>
  );
};
