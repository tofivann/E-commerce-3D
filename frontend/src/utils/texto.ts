// Búsqueda de texto en listas que se filtran en memoria (las que no son
// paginadas: biblioteca, comisiones). El catálogo busca en el backend, con
// la misma normalización (core/text_utils.py::normalizar_texto).

// NFD + quitar marcas combinantes (acentos) + minúsculas.
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// true si CADA palabra de la búsqueda aparece en alguno de los campos, sin
// importar acentos ni mayúsculas (como el SearchFilter de DRF que usa el
// catálogo). Una búsqueda vacía coincide con todo.
export function coincideBusqueda(busqueda: string, campos: (string | null | undefined)[]): boolean {
  const terminos = normalizarTexto(busqueda).split(/\s+/).filter(Boolean);
  if (terminos.length === 0) return true;
  const buscable = normalizarTexto(campos.filter(Boolean).join(" "));
  return terminos.every((termino) => buscable.includes(termino));
}
