// Reglas de las monedas que el frontend necesita conocer. La fuente de
// verdad es el backend (monedas/reglas.py), que valida todo de nuevo.

// Precio en monedas con que aparece relleno el campo al subir un producto,
// un tramo o un juego nuevo. Espejo de PRECIO_EN_MONEDAS_POR_DEFECTO.
export const PRECIO_EN_MONEDAS_POR_DEFECTO = 10;

// Un producto se paga con MimiCoins si acepta esa forma de pago y tiene
// precio en MimiCoins (espejo de Producto.pagable_con_monedas).
export function pagableConMonedas(producto: { acepta_monedas: boolean; precio_monedas?: number | null }): boolean {
  return producto.acepta_monedas && producto.precio_monedas != null;
}

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
