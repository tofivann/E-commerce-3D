// Importes en USD escritos a mano en un <input type="text" inputMode="decimal">
// (no type="number": ese descarta en silencio una coma o un "$" y no deja
// explicar el error). Lo usan el precio de reventa del modal de entrega y el
// monto que paga el cliente al solicitar una comisión.

// Dígitos y, opcionalmente, punto con uno o dos decimales: "40", "40.5", "40.50".
export const IMPORTE_VALIDO = /^\d+(\.\d{1,2})?$/;

export function formatearImporte(valor: number | string): string {
  return Number(valor).toFixed(2);
}

export type EstadoMonto = "ok" | "formato" | "menorAlMinimo";

// Espejo de MontoComisionMixin en backend/custom_orders/serializers.py: el
// precio del tramo/juego es el mínimo, se puede pagar más y nunca menos.
export function evaluarMonto(texto: string, minimo: number): EstadoMonto {
  if (!IMPORTE_VALIDO.test(texto.trim())) return "formato";
  return Number(texto) < minimo ? "menorAlMinimo" : "ok";
}
