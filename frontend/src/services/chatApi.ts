import { axiosClient } from './axiosClient';
import type { Usuario } from './userApi';

export interface UltimoMensaje {
    contenido: string;
    fecha: string;
    remitente: string;
}

export interface Conversacion {
    id: number;
    usuario: number;
    usuario_info: Usuario;
    fecha_creacion: string;
    fecha_ultima_actividad: string;
    ultimo_mensaje: UltimoMensaje | null;
    mensajes_no_leidos: number;
}

export interface Mensaje {
    id: number;
    conversacion: number;
    remitente: number;
    remitente_nombre: string;
    contenido: string;
    fecha_envio: string;
}

export const chatApi = {
    listarConversaciones: async (): Promise<Conversacion[]> => {
        const response = await axiosClient.get<Conversacion[]>('chat/conversaciones/');
        return response.data;
    },

    crearConversacion: async (): Promise<Conversacion> => {
        const response = await axiosClient.post<Conversacion>('chat/conversaciones/');
        return response.data;
    },

    obtenerMensajes: async (conversacionId: number): Promise<Mensaje[]> => {
        const response = await axiosClient.get<Mensaje[]>(`chat/conversaciones/${conversacionId}/mensajes/`);
        return response.data;
    },

    enviarMensaje: async (conversacionId: number, contenido: string): Promise<Mensaje> => {
        const response = await axiosClient.post<Mensaje>(`chat/conversaciones/${conversacionId}/mensajes/`, {
            contenido,
        });
        return response.data;
    },
};