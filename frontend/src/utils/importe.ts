// Importes en USD escritos a mano en un <input type="text" inputMode="decimal">
// (no type="number": ese descarta en silencio una coma o un "$" y no deja
// explicar el error). Lo usan el precio de reventa del modal de entrega y el
// monto que paga el cliente al solicitar una comisión.

// Dígitos y, opcionalmente, punto con uno o dos decimales: "40", "40.5", "40.50".
export const IMPORTE_VALIDO = /^\d+(\.\d{1,2})?$/;

export function formatearImporte(valor: number | string): string {
  return Number(valor).toFixed(2);
}

// Para mostrar dinero (no para inputs): "$1,234.50". Siempre con este
// formato, sea cual sea el idioma de la interfaz: es como se muestran los
// precios en todo el sitio ("$100.00"), y el formato local de "es" ("1234,50
// US$") es más largo y se corta en las tarjetas.
const FORMATO_DINERO = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatearDinero(valor: number | string): string {
  return FORMATO_DINERO.format(Number(valor));
}

export type EstadoMonto = "ok" | "formato" | "menorAlMinimo";

// Espejo de MontoComisionMixin en backend/custom_orders/serializers.py: el
// precio del tramo/juego es el mínimo, se puede pagar más y nunca menos.
export function evaluarMonto(texto: string, minimo: number): EstadoMonto {
  if (!IMPORTE_VALIDO.test(texto.trim())) return "formato";
  return Number(texto) < minimo ? "menorAlMinimo" : "ok";
}
