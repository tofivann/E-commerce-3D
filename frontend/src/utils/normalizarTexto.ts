// Quita acentos/diacríticos y normaliza a minúsculas para comparar texto
// sin importar cómo se hayan escrito los acentos (ej. "pelicula" === "película").
// NFD separa cada letra acentuada en (letra base + marca de acento combinante);
// el rango U+0300-U+036F cubre esas marcas combinantes en Unicode, así que
// eliminarlas deja solo la letra base.
const hex4 = (codigo: number) => codigo.toString(16).padStart(4, "0");
const CODIGO_INICIO = 0x0300;
const CODIGO_FIN = 0x036f;
const MARCAS_DIACRITICAS = new RegExp(
  `[\\u${hex4(CODIGO_INICIO)}-\\u${hex4(CODIGO_FIN)}]`,
  "g"
);

export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .toLowerCase()
    .trim();
}

// true si `texto` contiene `busqueda`, ignorando acentos, mayúsculas y espacios extra.
export function coincideBusqueda(texto: string, busqueda: string): boolean {
  if (!busqueda.trim()) return true;
  return normalizarTexto(texto).includes(normalizarTexto(busqueda));
}
