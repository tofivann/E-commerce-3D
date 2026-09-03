import React from "react";
import type { Producto } from "../../api/productos.api";

interface ProductDetailsModalProps {
  producto: Producto | null;
  hasAccess: boolean;
  onClose: () => void;
  onAddToCart?: (producto: Producto) => void;
}

const fallbackImage =
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";

// Extrae el ID de video de los formatos comunes de link de YouTube
// (watch?v=, youtu.be/, embed/, shorts/), para poder embeberlo.
function extraerIdYoutube(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  producto,
  hasAccess,
  onClose,
  onAddToCart,
}) => {
  if (!producto) return null;

  const videoId = extraerIdYoutube(producto.link_youtube);
  const imagenUrl =
    typeof producto.imagen_previa === "string" && producto.imagen_previa
      ? producto.imagen_previa
      : fallbackImage;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel relative w-full max-w-2xl rounded-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto bg-surface-container-lowest/95">
        <button
          type="button"
          className="absolute top-6 right-6 text-on-surface-variant hover:text-primary transition-colors"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {videoId ? (
          <div className="w-full aspect-video rounded-xl overflow-hidden mb-6 bg-surface-container-lowest">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={`Vista previa de ${producto.titulo}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="w-full h-56 rounded-xl overflow-hidden mb-6 bg-surface-container-lowest">
            <img src={imagenUrl} alt={producto.titulo} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex justify-between items-start gap-4 mb-2">
          <h2 className="text-2xl font-bold text-on-surface">{producto.titulo}</h2>
          <span className="font-mono text-on-secondary-container border border-secondary-container/50 px-2 py-1 rounded-full text-xs uppercase shrink-0">
            .{producto.formato_archivo || "3D"}
          </span>
        </div>

        <p className="text-on-surface-variant mb-6 whitespace-pre-line">
          {producto.descripcion || "Modelo MMD 3D."}
        </p>

        {videoId && (
          <a
            href={producto.link_youtube || undefined}
            target="_blank"
            rel="noreferrer"
            className="text-primary-fixed-dim text-sm hover:underline no-underline inline-flex items-center gap-1 mb-6 self-start"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            Ver en YouTube
          </a>
        )}

        <div className="mt-auto pt-4 border-t border-outline-variant/30 flex items-center justify-between">
          {hasAccess ? (
            <>
              <span className="text-primary-container font-bold font-mono text-xl">
                ${Number(producto.precio).toFixed(2)}
              </span>
              <button
                onClick={() => {
                  onAddToCart && onAddToCart(producto);
                  onClose();
                }}
                className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-2.5 px-6 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                Agregar al carrito
              </button>
            </>
          ) : (
            <p className="text-on-surface-variant text-sm">
              Regístrate o activa tu suscripción para desbloquear el precio y la descarga.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
