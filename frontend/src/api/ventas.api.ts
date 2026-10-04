import { axiosClient } from "../services/axiosClient";
import type { EstadoComision } from "./comisiones.api";
import type { RespuestaPaginada } from "./types";

// Sección "Estadísticas y pagos" del panel admin. Una venta es una orden
// pagada (compra de la tienda o comisión); las reglas de qué cuenta y qué
// entra en cada filtro viven en el backend (orders/ventas.py).

// Mismas claves y mismo orden que FILTROS en orders/ventas.py.
export const FILTROS_VENTAS = ["todas", "comisiones", "tienda", "en_proceso", "completadas"] as const;
export type FiltroVentas = (typeof FILTROS_VENTAS)[number];

export type TipoOrden = "CATALOGO" | "COMISION_MOTION" | "COMISION_MODELO";

export interface Venta {
  id: number;
  codigo_orden: string;
  fecha_orden: string;
  // Lo cobrado al cliente.
  total: number | string;
  tipo_orden: TipoOrden;
  pasarela_pago: string;
  cliente_nombre: string;
  cliente_email: string;
  // Qué se vendió. null = un producto eliminado después de la venta.
  conceptos: (string | null)[];
  // null en las compras de la tienda.
  estado_comision: EstadoComision | null;
}

export type ResumenVentas = Record<FiltroVentas, { total: number | string; cantidad: number }>;

// Instantes ISO del intervalo [desde, hasta); ver utils/fechas.ts::instantesDeRango.
export interface RangoInstantes {
  desde?: string;
  hasta?: string;
}

const BASE = "orders/admin/ventas/";

export const ventasAdminApi = {
  listar: async (filtro: FiltroVentas, rango: RangoInstantes, page = 1): Promise<RespuestaPaginada<Venta>> => {
    const { data } = await axiosClient.get<RespuestaPaginada<Venta>>(BASE, {
      params: { filtro, page, ...rango },
    });
    return data;
  },
  resumen: async (rango: RangoInstantes): Promise<ResumenVentas> => {
    const { data } = await axiosClient.get<ResumenVentas>(`${BASE}resumen/`, { params: rango });
    return data;
  },
};
