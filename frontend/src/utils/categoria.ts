import type { Categoria } from "../api/productos.api";

// El nombre de una Categoria se escribe en ambos idiomas al crearla/editarla
// (nombre + nombre_en) — a diferencia del resto del contenido dinámico del
// sitio (nombres de juegos, títulos de producto, etc.), que nunca se traduce.
export function nombreCategoria(categoria: Categoria, lang: string): string {
  return lang.startsWith("en") ? categoria.nombre_en : categoria.nombre;
}

// AND inclusivo: el ítem tiene TODAS las categorías marcadas, y puede tener
// otras además — cada etiqueta marcada acota la lista ("Bang Dream" + "Motion"
// = solo los motions de Bang Dream). Sin nada marcado no se filtra. Es el
// espejo de CategoriasFilter en backend/products/filters.py; si cambia uno,
// cambia el otro. Lo usan las listas que se filtran en memoria por no ser
// paginadas: la biblioteca y las comisiones del admin.
export function tieneTodasLasCategorias(categoriasDelItem: number[], seleccionadas: Set<number>): boolean {
  const propias = new Set(categoriasDelItem);
  return [...seleccionadas].every((id) => propias.has(id));
}
