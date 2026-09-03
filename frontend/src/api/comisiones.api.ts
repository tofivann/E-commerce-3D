import { axiosClient } from "../services/axiosClient";

export type EstadoComision = "SOLICITADO" | "EN_PROCESO" | "COMPLETADO" | "CANCELADO";

export interface OrdenResumen {
  id: number;
  codigo_orden: string;
  total: number | string;
  estado_pago: string;
  fecha_orden: string;
}

export interface TramoPersonajesMotion {
  id: number;
  nombre: string;
  min_personajes: number;
  max_personajes: number;
  precio: number | string;
  activo: boolean;
  orden_visualizacion: number;
}

export interface JuegoComision {
  id: number;
  nombre: string;
  precio: number | string;
  activo: boolean;
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
  descarga_url: string | null;
}

export interface ComisionModelo {
  id: number;
  orden: OrdenResumen;
  juego: JuegoComision;
  nombre_personaje: string;
  foto_referencia_1: string;
  foto_referencia_2: string | null;
  estado: EstadoComision;
  producto_publicado: number | null;
  descarga_url: string | null;
}

export interface SolicitudComisionMotion {
  tramo_personajes: number;
  nombre_juego: string;
  nombre_cancion: string;
  link_video: string;
  informacion_adicional?: string;
}

export interface CheckoutComisionResponse<T> {
  checkout_url: string;
  comision: T;
}

export interface ComisionMotionAdmin extends Omit<ComisionMotion, "descarga_url"> {
  usuario_nombre: string;
  usuario_email: string;
  archivo_entrega: string | null;
}

export interface ComisionModeloAdmin extends Omit<ComisionModelo, "descarga_url"> {
  usuario_nombre: string;
  usuario_email: string;
  archivo_entrega: string | null;
}

export interface PublicarProductoPayload {
  titulo: string;
  descripcion: string;
  precio: string | number;
  formato_archivo: string;
  imagen_previa?: File;
}

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
};

export const comisionesAdminApi = {
  // Precios: Juegos
  crearJuego: async (payload: { nombre: string; precio: string; activo: boolean }): Promise<JuegoComision> => {
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
  publicarComisionModelo: async (
    id: number,
    payload: PublicarProductoPayload,
  ): Promise<ComisionModeloAdmin> => {
    const formData = new FormData();
    formData.append("titulo", payload.titulo);
    formData.append("descripcion", payload.descripcion);
    formData.append("precio", String(payload.precio));
    formData.append("formato_archivo", payload.formato_archivo);
    if (payload.imagen_previa) formData.append("imagen_previa", payload.imagen_previa);

    const { data } = await axiosClient.post(
      `custom-orders/admin/comisiones/modelo/${id}/publicar/`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },
};

// Descarga autenticada del archivo de entrega (blob + JWT, mismo patrón que biblioteca.api.ts)
async function descargar(path: string, filenameFallback: string): Promise<void> {
  const response = await axiosClient.get(path, { responseType: "blob" });

  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || filenameFallback;

  const blobUrl = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

export async function descargarComisionMotion(comision: ComisionMotion): Promise<void> {
  if (!comision.descarga_url) return;
  await descargar(`custom-orders/comisiones/motion/${comision.id}/descargar/`, `${comision.nombre_cancion}.zip`);
}

export async function descargarComisionModelo(comision: ComisionModelo): Promise<void> {
  if (!comision.descarga_url) return;
  await descargar(`custom-orders/comisiones/modelo/${comision.id}/descargar/`, `${comision.nombre_personaje}.zip`);
}
