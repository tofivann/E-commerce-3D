// Reglas de las monedas que el frontend necesita conocer. La fuente de
// verdad es el backend (monedas/reglas.py), que valida todo de nuevo.

// Precio en monedas con que aparece relleno el campo al subir un producto,
// un tramo o un juego nuevo. Espejo de PRECIO_EN_MONEDAS_POR_DEFECTO.
export const PRECIO_EN_MONEDAS_POR_DEFECTO = 10;

// Un precio en monedas escrito en un input: entero de 1 en adelante, o
// vacío (= no se puede pagar con monedas).
export function precioMonedasValido(texto: string): boolean {
  const limpio = texto.trim();
  return limpio === "" || (/^\d+$/.test(limpio) && Number(limpio) >= 1);
}

// Del valor guardado al texto del input, y de vuelta.
export function precioMonedasATexto(precio: number | null | undefined): string {
  return precio == null ? "" : String(precio);
}

export function textoAPrecioMonedas(texto: string): number | null {
  const limpio = texto.trim();
  return limpio === "" ? null : Number(limpio);
}
