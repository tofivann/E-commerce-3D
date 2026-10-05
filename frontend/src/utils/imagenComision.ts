import type { ComisionModelo, ComisionMotion } from "../api/comisiones.api";

// Solo los campos de foto, para que sirva igual con la comisión que ve el
// cliente y con la que ve el admin (que tiene más datos).
type FotosMotion = Pick<ComisionMotion, "foto_entrega" | "foto_entrega_miniatura">;
type FotosModelo = Pick<
  ComisionModelo,
  "foto_entrega" | "foto_entrega_miniatura" | "foto_referencia_1" | "foto_referencia_1_miniatura"
>;
type ComisionConFotos = { tipo: "motion"; data: FotosMotion } | { tipo: "modelo"; data: FotosModelo };

// Versión ligera de una foto de comisión (la miniatura que genera el
// servidor). Si todavía no tiene miniatura, la foto original.
export function miniaturaComision(original: string | null, miniatura: string | null): string | null {
  return miniatura || original || null;
}

// La foto de la tarjeta de una comisión: el resultado entregado si ya existe;
// si no, la foto de referencia que subió el cliente (solo las de Modelo la
// tienen). Siempre en su versión ligera.
export function fotoTarjetaComision(item: ComisionConFotos): string | null {
  const entrega = miniaturaComision(item.data.foto_entrega, item.data.foto_entrega_miniatura);
  if (entrega || item.tipo === "motion") return entrega;
  return miniaturaComision(item.data.foto_referencia_1, item.data.foto_referencia_1_miniatura);
}
