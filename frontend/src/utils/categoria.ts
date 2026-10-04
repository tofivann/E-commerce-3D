import type { Categoria } from "../api/productos.api";

// El nombre de una Categoria se escribe en ambos idiomas al crearla/editarla
// (nombre + nombre_en) — a diferencia del resto del contenido dinámico del
// sitio (nombres de juegos, títulos de producto, etc.), que nunca se traduce.
export function nombreCategoria(categoria: Categoria, lang: string): string {
  return lang.startsWith("en") ? categoria.nombre_en : categoria.nombre;
}

// "Al menos una" (OR): el ítem tiene alguna de las categorías marcadas — cada
// etiqueta marcada amplía la lista ("Bang Dream" + "Motion" = todo lo de Bang
// Dream más todos los motions). Sin nada marcado no se filtra. Es el espejo
// de CategoriasFilter en backend/products/filters.py; si cambia uno, cambia
// el otro. Lo usan las listas que se filtran en memoria por no ser
// paginadas: la biblioteca y las comisiones del admin.
export function tieneAlgunaCategoria(categoriasDelItem: number[], seleccionadas: Set<number>): boolean {
  if (seleccionadas.size === 0) return true;
  return categoriasDelItem.some((id) => seleccionadas.has(id));
}
