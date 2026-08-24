import React, { useEffect, useState } from "react";
import type { Carrito } from "../../api/carrito.api";
import { carritoApi } from "../../api/carrito.api";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  refreshKey?: number;
  onCartChange?: (carrito: Carrito | null) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  refreshKey = 0,
  onCartChange,
}) => {
  const [carrito, setCarrito] = useState<Carrito | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCheckoutError(null);
    fetchCarrito();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, refreshKey]);

  const fetchCarrito = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await carritoApi.obtener();
      setCarrito(data);
      onCartChange?.(data);
    } catch (err) {
      console.error("Error al cargar el carrito:", err);
      setError("No se pudo cargar el carrito.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (itemId: number) => {
    setRemovingId(itemId);
    try {
      const data = await carritoApi.eliminarItem(itemId);
      setCarrito(data);
      onCartChange?.(data);
    } catch (err) {
      console.error("Error al quitar el ítem:", err);
      window.alert("No se pudo quitar el producto del carrito.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const { checkout_url } = await carritoApi.checkout();
      // Redirige a la página de pago hospedada por Stripe. El carrito se
      // vacía y el acceso se otorga después, cuando Stripe confirma el pago.
      window.location.href = checkout_url;
    } catch (err) {
      console.error("Error al iniciar el pago:", err);
      setCheckoutError("No se pudo iniciar el pago. Inténtalo de nuevo.");
      setCheckingOut(false);
    }
  };

  if (!isOpen) return null;

  const items = carrito?.items ?? [];

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="glass-panel relative w-full max-w-md h-full bg-surface-container-lowest/95 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/30">
          <h2 className="text-xl font-bold text-on-surface">Tu Carrito</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-on-surface-variant hover:text-primary transition-colors w-10 h-10 rounded-full hover:bg-surface-variant/50 flex items-center justify-center"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Error al iniciar el pago */}
        {checkoutError && (
          <div className="mx-6 mt-4 p-4 rounded-lg bg-error/15 border border-error/40 text-on-error-container text-sm">
            {checkoutError}
          </div>
        )}

        {/* Lista de ítems */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-10 text-on-surface-variant">
              Cargando carrito...
            </div>
          )}

          {error && (
            <div className="p-4 bg-error/20 border border-error/50 rounded-md text-on-error-container text-center text-sm">
              {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[40px] text-outline">
                shopping_cart
              </span>
              <p>Tu carrito está vacío.</p>
            </div>
          )}

          {!loading &&
            !error &&
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 group hover:bg-surface-variant transition-colors"
              >
                <div className="w-16 h-16 rounded-md overflow-hidden bg-surface-container-lowest shrink-0">
                  {typeof item.producto.imagen_previa === "string" && item.producto.imagen_previa ? (
                    <img
                      src={item.producto.imagen_previa}
                      alt={item.producto.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-outline">
                      <span className="material-symbols-outlined">deployed_code</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-on-surface truncate">{item.producto.titulo}</h3>
                  <p className="font-mono text-primary-fixed-dim text-sm mt-1">
                    ${Number(item.producto.precio).toFixed(2)}
                  </p>
                </div>
                <button
                  aria-label="Quitar"
                  disabled={removingId === item.id}
                  onClick={() => handleRemove(item.id)}
                  className="text-on-surface-variant hover:text-error transition-colors p-2 rounded-full hover:bg-error/10 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ))}
        </div>

        {/* Resumen y checkout */}
        {!loading && !error && items.length > 0 && (
          <div className="border-t border-outline-variant/30 px-6 py-5 bg-surface-container-low/60">
            <div className="space-y-1 mb-4 text-sm">
              <div className="flex justify-between text-on-surface-variant">
                <span>Subtotal</span>
                <span className="font-mono">${Number(carrito?.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Impuestos (8%)</span>
                <span className="font-mono">${Number(carrito?.impuestos).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-on-surface mt-2 pt-2 border-t border-outline-variant/30">
                <span>Total</span>
                <span className="font-mono text-primary-fixed-dim">
                  ${Number(carrito?.total).toFixed(2)}
                </span>
              </div>
            </div>
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-3 font-bold hover:bg-primary-fixed-dim transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">shopping_cart_checkout</span>
              {checkingOut ? "Redirigiendo a Stripe..." : "Proceder al Pago"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
