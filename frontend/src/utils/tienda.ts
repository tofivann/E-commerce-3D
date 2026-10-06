import type { Tienda } from "../api/productos.api";

// Los dos catálogos del sitio: la tienda (Inicio, se compra con dinero) y
// Mimi Gifts (su propia página, se canjea con MimiCoins). Un producto puede
// estar en los dos; ver Producto.acepta_dinero / acepta_monedas.

// Qué botón llevan las tarjetas en cada catálogo (ver ProductCard.accion).
export function accionDeTienda(tienda: Tienda): "carrito" | "canje" {
  return tienda === "monedas" ? "canje" : "carrito";
}
