// El formato de archivo de un producto (zip, rar, stl...) lo escribe el admin
// a mano, así que llega en mayúsculas o minúsculas según quien lo cargó. En
// pantalla se muestra SIEMPRE en minúsculas y con el punto delante (".zip"),
// en todos los sitios — por eso pasa por aquí y ningún componente lo
// formatea por su cuenta ni usa la clase `uppercase`.
//
// `sinFormato`: qué mostrar cuando el producto no tiene formato cargado.
export function etiquetaFormato(formato: string | null | undefined, sinFormato = ".3d"): string {
  const limpio = formato?.trim().replace(/^\.+/, "").toLowerCase();
  return limpio ? `.${limpio}` : sinFormato;
}
