import type { Categoria } from "../api/productos.api";

// El nombre de una Categoria se escribe en ambos idiomas al crearla/editarla
// (nombre + nombre_en) — a diferencia del resto del contenido dinámico del
// sitio (nombres de juegos, títulos de producto, etc.), que nunca se traduce.
export function nombreCategoria(categoria: Categoria, lang: string): string {
  return lang.startsWith("en") ? categoria.nombre_en : categoria.nombre;
}
