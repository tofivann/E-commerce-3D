import { axiosClient } from "../services/axiosClient";
import type { Categoria } from "./productos.api";
import { descargarConSesion } from "../utils/descarga";

export type { Categoria };

export type EstadoComision = "SOLICITADO" | "EN_PROCESO" | "COMPLETADO" | "CANCELADO";

export interface OrdenResumen {
  id: number;
  codigo_orden: string;
  total: number | string;
  // Solo si la comisión se pagó con monedas (pasarela_pago "Monedas"; total es 0).
  total_monedas: number | null;
  pasarela_pago: string;
  estado_pago: string;
  fecha_orden: string;
}

export interface TramoPersonajesMotion {
  id: number;
  nombre: string;
  min_personajes: number;
  max_personajes: number;
  precio: number | string;
  // Lo que cuesta pagándolo con monedas; null = no se puede pagar con monedas.
  precio_monedas: number | null;
  activo: boolean;
  orden_visualizacion: number;
}

export interface JuegoComision {
  id: number;
  nombre: string;
  precio: number | string;
  precio_monedas: number | null;
  activo: boolean;
}

// Respuesta de solicitar una comisión pagándola con monedas: queda pagada
// en la misma llamada (no hay pasarela).
export interface ComisionPagadaConMonedas<T> {
  comision: T;
  saldo_monedas: number;
}

export interface ComisionMotion {
  id: number;
  orden: OrdenResumen;
  tramo_personajes: TramoPersonajesMotion;
  nombre_juego: string;
  nombre_cancion: string;
  link_video: string;
  informacion_adicional: string;
  estado: EstadoComision;
  foto_entrega: string | null;
  // Solo lectura: copia ligera que genera el servidor, para tarjetas y
  // listas (ver utils/imagenComision.ts). null si no hay foto.
  foto_entrega_miniatura: string | null;
  categorias: Categoria[];
  producto_publicado: number | null;
  descarga_url: string | null;
}

export interface ComisionModelo {
  id: number;
  orden: OrdenResumen;
  juego: JuegoComision;
  nombre_personaje: string;
  foto_referencia_1: string;
  foto_referencia_2: string | null;
  foto_referencia_1_miniatura: string | null;
  foto_referencia_2_miniatura: string | null;
  estado: EstadoComision;
  foto_entrega: string | null;
  // Solo lectura: copia ligera que genera el servidor, para tarjetas y
  // listas (ver utils/imagenComision.ts). null si no hay foto.
  foto_entrega_miniatura: string | null;
  categorias: Categoria[];
  producto_publicado: number | null;
  descarga_url: string | null;
}

export interface SolicitudComisionMotion {
  tramo_personajes: number;
  nombre_juego: string;
  nombre_cancion: string;
  link_video: string;
  informacion_adicional?: string;
  // Lo que paga el cliente: el precio del tramo es el mínimo, puede ser más.
  monto: string;
}

export interface CheckoutComisionResponse<T> {
  checkout_url: string;
  comision: T;
}

export interface CheckoutComisionPayPalResponse<T> {
  paypal_order_id: string;
  comision: T;
}

// Datos de reventa que el admin llena al subir la entrega (mismo PATCH que
// archivo/foto/categorías). Son los campos del Producto que se crea al
// publicar; todos opcionales al guardar, obligatorios (salvo link_youtube)
// para publicar — `publicacion_completa` lo resume, lo calcula el backend.
export interface DatosPublicacion {
  titulo_publicacion: string;
  descripcion_publicacion: string;
  precio_publicacion: string | number | null;
  // Formas de pago con que se publicará el producto (al menos una) y su precio en MimiCoins.
  acepta_dinero_publicacion: boolean;
  acepta_monedas_publicacion: boolean;
  precio_monedas_publicacion: number | null;
  formato_archivo_publicacion: string;
  link_youtube: string | null;
  publicacion_completa: boolean;
}

// Campos que solo devuelven los serializers admin. Ojo con `categorias`: a
// diferencia del serializer cliente (objetos), aquí son **ids** — es el
// mismo campo con el que el admin escribe en el PATCH — y los objetos
// completos vienen en `categorias_detalle` (mismo par que Producto). Para
// leer nombres/ids en el panel usar siempre `categorias_detalle`.
interface CamposAdmin extends DatosPublicacion {
  usuario_nombre: string;
  usuario_email: string;
  // Nombre del archivo entregado (null = todavía no hay entrega). El archivo
  // en sí no tiene dirección pública: se baja con comisionesAdminApi.descargarEntrega.
  archivo_entrega_nombre: string | null;
  categorias: number[];
  categorias_detalle: Categoria[];
}

export interface ComisionMotionAdmin extends Omit<ComisionMotion, "descarga_url" | "categorias">, CamposAdmin {}

export interface ComisionModeloAdmin extends Omit<ComisionModelo, "descarga_url" | "categorias">, CamposAdmin {}

export const comisionesApi = {
  // Tablas de precio (lectura para armar el formulario del cliente)
  listarTramosMotion: async (): Promise<TramoPersonajesMotion[]> => {
    const { data } = await axiosClient.get<TramoPersonajesMotion[]>("custom-orders/tramos-motion/");
    return data;
  },
  listarJuegos: async (): Promise<JuegoComision[]> => {
    const { data } = await axiosClient.get<JuegoComision[]>("custom-orders/juegos/");
    return data;
  },

  // Comisiones de Motion
  misComisionesMotion: async (): Promise<ComisionMotion[]> => {
    const { data } = await axiosClient.get<ComisionMotion[]>("custom-orders/comisiones/motion/");
    return data;
  },
  solicitarComisionMotion: async (
    payload: SolicitudComisionMotion,
  ): Promise<CheckoutComisionResponse<ComisionMotion>> => {
    const { data } = await axiosClient.post("custom-orders/comisiones/motion/", payload);
    return data;
  },
  solicitarComisionMotionPayPal: async (
    payload: SolicitudComisionMotion,
  ): Promise<CheckoutComisionPayPalResponse<ComisionMotion>> => {
    const { data } = await axiosClient.post("custom-orders/comisiones/motion/paypal/", payload);
    return data;
  },
  // Con monedas se cobra el precio en monedas del tramo; `monto` no aplica.
  solicitarComisionMotionMonedas: async (
    payload: Omit<SolicitudComisionMotion, "monto">,
  ): Promise<ComisionPagadaConMonedas<ComisionMotion>> => {
    const { data } = await axiosClient.post("custom-orders/comisiones/motion/monedas/", payload);
    return data;
  },

  // Comisiones de Modelo Nuevo
  misComisionesModelo: async (): Promise<ComisionModelo[]> => {
    const { data } = await axiosClient.get<ComisionModelo[]>("custom-orders/comisiones/modelo/");
    return data;
  },
  solicitarComisionModelo: async (
    formData: FormData,
  ): Promise<CheckoutComisionResponse<ComisionModelo>> => {
    const { data } = await axiosClient.post("custom-orders/comisiones/modelo/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  solicitarComisionModeloPayPal: async (
    formData: FormData,
  ): Promise<CheckoutComisionPayPalResponse<ComisionModelo>> => {
    const { data } = await axiosClient.post("custom-orders/comisiones/modelo/paypal/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  solicitarComisionModeloMonedas: async (
    formData: FormData,
  ): Promise<ComisionPagadaConMonedas<ComisionModelo>> => {
    const { data } = await axiosClient.post("custom-orders/comisiones/modelo/monedas/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};

export const comisionesAdminApi = {
  // Precios: Juegos
  crearJuego: async (
    payload: { nombre: string; precio: string; precio_monedas: number | null; activo: boolean },
  ): Promise<JuegoComision> => {
    const { data } = await axiosClient.post("custom-orders/juegos/", payload);
    return data;
  },
  actualizarJuego: async (id: number, payload: Partial<JuegoComision>): Promise<JuegoComision> => {
    const { data } = await axiosClient.patch(`custom-orders/juegos/${id}/`, payload);
    return data;
  },
  eliminarJuego: async (id: number): Promise<void> => {
    await axiosClient.delete(`custom-orders/juegos/${id}/`);
  },

  // Precios: Tramos de Motion
  crearTramo: async (
    payload: Omit<TramoPersonajesMotion, "id">,
  ): Promise<TramoPersonajesMotion> => {
    const { data } = await axiosClient.post("custom-orders/tramos-motion/", payload);
    return data;
  },
  actualizarTramo: async (
    id: number,
    payload: Partial<TramoPersonajesMotion>,
  ): Promise<TramoPersonajesMotion> => {
    const { data } = await axiosClient.patch(`custom-orders/tramos-motion/${id}/`, payload);
    return data;
  },
  eliminarTramo: async (id: number): Promise<void> => {
    await axiosClient.delete(`custom-orders/tramos-motion/${id}/`);
  },

  // Solicitudes: Motion
  listarSolicitudesMotion: async (): Promise<ComisionMotionAdmin[]> => {
    const { data } = await axiosClient.get<ComisionMotionAdmin[]>("custom-orders/admin/comisiones/motion/");
    return data;
  },
  actualizarSolicitudMotion: async (id: number, formData: FormData): Promise<ComisionMotionAdmin> => {
    const { data } = await axiosClient.patch(`custom-orders/admin/comisiones/motion/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  // Solicitudes: Modelo Nuevo
  listarSolicitudesModelo: async (): Promise<ComisionModeloAdmin[]> => {
    const { data } = await axiosClient.get<ComisionModeloAdmin[]>("custom-orders/admin/comisiones/modelo/");
    return data;
  },
  actualizarSolicitudModelo: async (id: number, formData: FormData): Promise<ComisionModeloAdmin> => {
    const { data } = await axiosClient.patch(`custom-orders/admin/comisiones/modelo/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  // Sin body: el backend arma el Producto con los datos de reventa que ya
  // quedaron guardados en la comisión (DatosPublicacion) al subir la entrega.
  publicarComisionModelo: async (id: number): Promise<ComisionModeloAdmin> => {
    const { data } = await axiosClient.post(`custom-orders/admin/comisiones/modelo/${id}/publicar/`);
    return data;
  },
  publicarComisionMotion: async (id: number): Promise<ComisionMotionAdmin> => {
    const { data } = await axiosClient.post(`custom-orders/admin/comisiones/motion/${id}/publicar/`);
    return data;
  },
  // Archivo entregado de una comisión, para el admin.
  descargarEntrega: (tipo: "motion" | "modelo", id: number, nombre: string): Promise<void> =>
    descargarConSesion(`custom-orders/admin/comisiones/${tipo}/${id}/descargar/`, nombre),
};

export async function descargarComisionMotion(comision: ComisionMotion): Promise<void> {
  if (!comision.descarga_url) return;
  await descargarConSesion(`custom-orders/comisiones/motion/${comision.id}/descargar/`, `${comision.nombre_cancion}.zip`);
}

export async function descargarComisionModelo(comision: ComisionModelo): Promise<void> {
  if (!comision.descarga_url) return;
  await descargarConSesion(`custom-orders/comisiones/modelo/${comision.id}/descargar/`, `${comision.nombre_personaje}.zip`);
}
