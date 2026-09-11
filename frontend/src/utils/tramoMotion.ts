import type { TramoPersonajesMotion } from "../api/comisiones.api";

export function nombreTramoMotion(tramo: TramoPersonajesMotion): string {
  return `${tramo.nombre} ${tramo.min_personajes}-${tramo.max_personajes}`;
}
