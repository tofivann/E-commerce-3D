import type { Tienda } from "../api/productos.api";

// Las dos tiendas de Inicio: la normal (se compra con dinero) y la Tienda
// MimiCoins (se canjea con MimiCoins). La elegida vive en la URL
// (?tienda=mimicoins) para que recargar o compartir el enlace abra la misma
// pestaña; estas dos funciones son el único sitio que conoce ese parámetro.
const PARAMETRO = "tienda";
const VALOR_MIMICOINS = "mimicoins";

export function leerTienda(params: URLSearchParams): Tienda {
  return params.get(PARAMETRO) === VALOR_MIMICOINS ? "monedas" : "dinero";
}

export function conTienda(params: URLSearchParams, tienda: Tienda): URLSearchParams {
  const siguiente = new URLSearchParams(params);
  if (tienda === "monedas") siguiente.set(PARAMETRO, VALOR_MIMICOINS);
  else siguiente.delete(PARAMETRO);
  return siguiente;
}

// Qué botón llevan las tarjetas en cada tienda (ver ProductCard.accion).
export function accionDeTienda(tienda: Tienda): "carrito" | "canje" {
  return tienda === "monedas" ? "canje" : "carrito";
}
