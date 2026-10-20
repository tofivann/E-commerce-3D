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
    remitente_es_admin: boolean;
    contenido: string;
    fecha_envio: string;
}

// Para el globo del menú: mensajes sin leer de quien pregunta (admin: de los
// clientes en todas las conversaciones; cliente: del admin en la suya).
export interface NoLeidos {
    mensajes: number;
    conversaciones: number;
}

export const chatApi = {
    noLeidos: async (): Promise<NoLeidos> => {
        const response = await axiosClient.get<NoLeidos>('chat/no-leidos/');
        return response.data;
    },
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