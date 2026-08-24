import { axiosClient } from "../services/axiosClient";
import type { Producto } from "./productos.api";
import type { CompraDigital } from "./biblioteca.api";

export interface CarritoItem {
  id: number;
  producto: Producto;
}

export interface Carrito {
  id: number;
  items: CarritoItem[];
  subtotal: number;
  impuestos: number;
  total: number;
  fecha_actualizacion: string;
}

export interface DetalleOrden {
  id: number;
  producto: Producto;
  precio_unitario: number | string;
}

export type EstadoPago = "PENDIENTE" | "COMPLETADO" | "REEMBOLSADO" | "CANCELADO";

export interface Orden {
  id: number;
  codigo_orden: string;
  total: number | string;
  estado_pago: EstadoPago;
  tipo_orden: string;
  pasarela_pago: string;
  fecha_orden: string;
  detalles: DetalleOrden[];
  // Solo viene lleno una vez que Stripe confirma el pago (vía webhook).
  compras_digitales: CompraDigital[];
}

export interface CheckoutResponse {
  checkout_url: string;
}

// API del carrito de compras (un carrito por usuario autenticado)
export const carritoApi = {
  // Obtiene (y crea si no existe) el carrito del usuario autenticado
  obtener: async (): Promise<Carrito> => {
    const { data } = await axiosClient.get<Carrito>("cart/mio/");
    return data;
  },

  // Agrega un producto al carrito (idempotente: si ya está, no lo duplica)
  agregarItem: async (productoId: number): Promise<Carrito> => {
    const { data } = await axiosClient.post<Carrito>("cart/items/", {
      producto: productoId,
    });
    return data;
  },

  // Quita un ítem del carrito
  eliminarItem: async (itemId: number): Promise<Carrito> => {
    const { data } = await axiosClient.delete<Carrito>(`cart/items/${itemId}/`);
    return data;
  },

  // Inicia el cobro: crea la orden (PENDIENTE) y una Stripe Checkout Session.
  // Devuelve la URL hospedada por Stripe a la que hay que redirigir al usuario;
  // el acceso a los productos se otorga después, cuando Stripe confirma el pago
  // (vía webhook), no en esta llamada.
  checkout: async (): Promise<CheckoutResponse> => {
    const { data } = await axiosClient.post<CheckoutResponse>("cart/checkout/");
    return data;
  },

  // Consulta el estado de una orden por el session_id que Stripe agrega a la
  // success_url. Se usa en la pantalla de "Pago Completado" para esperar la
  // confirmación del webhook.
  obtenerOrdenPorSesion: async (sessionId: string): Promise<Orden> => {
    const { data } = await axiosClient.get<Orden>(`cart/orden/${sessionId}/`);
    return data;
  },
};
