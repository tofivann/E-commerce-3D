import { axiosClient } from "../services/axiosClient";
import type { RespuestaPaginada } from "./types";

// Novedades: publicaciones de la dueña (texto, fotos, video de YouTube) con
// comentarios de los clientes. Backend: publicaciones/ (api/v1/novedades/).

export interface AutorComentario {
  id: number;
  username: string;
  nombre: string;
  foto_perfil: string | null;
}

export interface FotoPublicacion {
  id: number;
  imagen: string;
  imagen_miniatura: string | null;
  orden: number;
}

export interface Publicacion {
  id: number;
  titulo: string;
  texto: string;
  link_youtube: string;
  publicado: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
  fotos: FotoPublicacion[];
  total_comentarios: number;
}

export interface Comentario {
  id: number;
  usuario: AutorComentario;
  texto: string;
  fecha_creacion: string;
  // Lo calcula el backend: el autor o el staff.
  puede_borrar: boolean;
}

// Datos del formulario del admin. Las fotos van en el mismo multipart:
// `fotos` (archivos nuevos) y `fotos_eliminar` (ids de las que se quitan).
export interface DatosPublicacion {
  titulo: string;
  texto: string;
  link_youtube: string;
  publicado: boolean;
  fotosNuevas: File[];
  fotosEliminar: number[];
}

// axiosClient fija Content-Type: application/json por defecto; con un
// FormData hay que decir multipart o axios lo convierte a JSON y las fotos
// se pierden (mismo apaño que en productos.api.ts).
const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };

const aFormData = (datos: DatosPublicacion) => {
  const data = new FormData();
  data.append("titulo", datos.titulo);
  data.append("texto", datos.texto);
  data.append("link_youtube", datos.link_youtube);
  data.append("publicado", datos.publicado ? "true" : "false");
  datos.fotosNuevas.forEach((foto) => data.append("fotos", foto));
  datos.fotosEliminar.forEach((id) => data.append("fotos_eliminar", String(id)));
  return data;
};

export const novedadesApi = {
  // Publicadas; el staff puede pedir también los borradores.
  listar: async (page = 1, incluirBorradores = false): Promise<RespuestaPaginada<Publicacion>> => {
    const { data } = await axiosClient.get<RespuestaPaginada<Publicacion>>("novedades/publicaciones/", {
      params: { page, ...(incluirBorradores ? { incluir_borradores: "true" } : {}) },
    });
    return data;
  },
  crear: async (datos: DatosPublicacion): Promise<Publicacion> => {
    const { data } = await axiosClient.post<Publicacion>("novedades/publicaciones/", aFormData(datos), MULTIPART);
    return data;
  },
  editar: async (id: number, datos: DatosPublicacion): Promise<Publicacion> => {
    const { data } = await axiosClient.patch<Publicacion>(`novedades/publicaciones/${id}/`, aFormData(datos), MULTIPART);
    return data;
  },
  eliminar: async (id: number): Promise<void> => {
    await axiosClient.delete(`novedades/publicaciones/${id}/`);
  },

  listarComentarios: async (publicacionId: number, page = 1): Promise<RespuestaPaginada<Comentario>> => {
    const { data } = await axiosClient.get<RespuestaPaginada<Comentario>>(
      `novedades/publicaciones/${publicacionId}/comentarios/`,
      { params: { page } },
    );
    return data;
  },
  comentar: async (publicacionId: number, texto: string): Promise<Comentario> => {
    const { data } = await axiosClient.post<Comentario>(`novedades/publicaciones/${publicacionId}/comentarios/`, { texto });
    return data;
  },
  eliminarComentario: async (id: number): Promise<void> => {
    await axiosClient.delete(`novedades/comentarios/${id}/`);
  },
};
