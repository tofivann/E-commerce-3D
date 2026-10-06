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
  // Lo que cuesta el carrito entero pagado con monedas; null si no se puede
  // pagar así (algún producto no tiene precio en monedas).
  total_monedas: number | null;
  fecha_actualizacion: string;
}

export interface DetalleOrden {
  id: number;
  producto: Producto;
  precio_unitario: number | string;
  // Solo en una orden pagada con monedas.
  precio_monedas: number | null;
}

export type EstadoPago = "PENDIENTE" | "COMPLETADO" | "REEMBOLSADO" | "CANCELADO";

export interface Orden {
  id: number;
  codigo_orden: string;
  total: number | string;
  // Solo en una orden pagada con monedas (pasarela_pago "Monedas"; total es 0).
  total_monedas: number | null;
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

export interface CheckoutPayPalResponse {
  paypal_order_id: string;
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

  // Igual que checkout(), pero crea una orden de PayPal en vez de una Stripe
  // Checkout Session. Se captura con paypal.api.ts::capturarOrdenPayPal.
  checkoutPayPal: async (): Promise<CheckoutPayPalResponse> => {
    const { data } = await axiosClient.post<CheckoutPayPalResponse>("cart/checkout-paypal/");
    return data;
  },

  // Paga el carrito entero con monedas. No hay pasarela: los productos quedan
  // en la biblioteca en esta misma llamada. Devuelve el saldo que le queda.
  checkoutMonedas: async (): Promise<number> => {
    const { data } = await axiosClient.post<{ orden: Orden; saldo_monedas: number }>("cart/checkout-monedas/");
    return data.saldo_monedas;
  },

  // Canje directo de UN producto con MimiCoins, sin pasar por el carrito (la
  // Mimi Gifts). Queda en la biblioteca al instante. Devuelve el saldo
  // que le queda al usuario.
  canjearMonedas: async (productoId: number): Promise<number> => {
    const { data } = await axiosClient.post<{ orden: Orden; saldo_monedas: number }>("cart/canjear-monedas/", {
      producto: productoId,
    });
    return data.saldo_monedas;
  },

  // Consulta el estado de una orden por el session_id que Stripe agrega a la
  // success_url. Se usa en la pantalla de "Pago Completado" para esperar la
  // confirmación del webhook.
  obtenerOrdenPorSesion: async (sessionId: string): Promise<Orden> => {
    const { data } = await axiosClient.get<Orden>(`cart/orden/${sessionId}/`);
    return data;
  },
};
