import type { Producto } from "../api/productos.api";

type ConImagenes = Pick<Producto, "imagen_previa" | "imagen_miniatura">;

// La portada original del producto (pesa ~1 MB): solo para verla en grande,
// en el detalle. `imagen_previa` es un File mientras se edita en el
// formulario; aquí solo interesa la dirección ya guardada.
export function portadaDe(producto: ConImagenes): string | null {
  return typeof producto.imagen_previa === "string" && producto.imagen_previa ? producto.imagen_previa : null;
}

// La imagen para tarjetas y listas: la miniatura que genera el servidor
// (unos pocos KB). Un producto sin miniatura cae a la portada original.
export function miniaturaDe(producto: ConImagenes): string | null {
  return producto.imagen_miniatura || portadaDe(producto);
}
