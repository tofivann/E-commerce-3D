import type { ComisionMotionAdmin, ComisionModeloAdmin, EstadoComision } from "../api/comisiones.api";
import { tieneAlgunaCategoria } from "./categoria";
import { coincideBusqueda } from "./texto";

// Mismo `Item` que arma SolicitudesComisionesTable (Motion y Modelo en una
// sola lista). Se declara aquí para que la lógica de filtrado sea pura y
// testeable sin depender de React ni del componente.
export type ItemComision =
  | { tipo: "motion"; data: ComisionMotionAdmin }
  | { tipo: "modelo"; data: ComisionModeloAdmin };

export interface FiltrosComisiones {
  // Sin estado = todas.
  estado: EstadoComision | null;
  // Ids de categoría; la comisión debe tener AL MENOS UNA (OR), igual que el
  // filtro de categorías del catálogo (tieneAlgunaCategoria). Es el
  // mismo Set que maneja CategoryFilter (que nunca lo muta: siempre crea uno
  // nuevo en onChange).
  categorias: Set<number>;
  // Texto libre: cliente, email, canción/personaje, juego o código de orden.
  // Sin acentos ni mayúsculas (misma normalización que el buscador del
  // catálogo hace en el backend).
  texto: string;
}

export const FILTROS_COMISIONES_VACIOS: FiltrosComisiones = {
  estado: null,
  categorias: new Set(),
  texto: "",
};

// Todo lo que el admin podría escribir para encontrar una comisión.
function camposBuscables(item: ItemComision): (string | null | undefined)[] {
  const comun = [item.data.usuario_nombre, item.data.usuario_email, item.data.orden.codigo_orden];
  const propios =
    item.tipo === "motion"
      ? [item.data.nombre_cancion, item.data.nombre_juego]
      : [item.data.nombre_personaje, item.data.juego.nombre];
  return [...comun, ...propios];
}

export function filtrarComisiones(items: ItemComision[], filtros: FiltrosComisiones): ItemComision[] {
  return items.filter((item) => {
    if (filtros.estado && item.data.estado !== filtros.estado) return false;

    // En la respuesta admin `categorias` ya son ids (ver CamposAdmin).
    if (!tieneAlgunaCategoria(item.data.categorias, filtros.categorias)) return false;

    // Cada palabra tiene que aparecer (AND entre términos), como DRF SearchFilter.
    if (!coincideBusqueda(filtros.texto, camposBuscables(item))) return false;
    return true;
  });
}
