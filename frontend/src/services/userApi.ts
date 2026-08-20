import { axiosClient } from './axiosClient';

export interface RegisterData {
  username: string;
  email: string;
  nombre: string;
  password: string;
}

export interface RegisterResponse {
  mensaje: string;
  email: string;
  estado_suscripcion: string;
}

export type Rol = 'CLIENTE' | 'ADMIN';
export type EstadoSuscripcion = 'INACTIVO' | 'PENDIENTE_PAGO' | 'ACTIVO' | 'NO_APLICA';

export interface Usuario {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  nombre: string;
  rol: Rol;
  estado_suscripcion: EstadoSuscripcion;
  is_active: boolean;
  fecha_registro?: string;
  password?: string;
}

export const userApi = {
  // Petición para registrar un nuevo cliente (Estado pendiente de pago)
  register: async (data: RegisterData): Promise<RegisterResponse> => {
    const response = await axiosClient.post<RegisterResponse>('users/auth/register/', data);
    return response.data;
  },

  // ==========================================
  // CRUD de usuarios (solo administradores)
  // ==========================================
  listar: async (): Promise<Usuario[]> => {
    const response = await axiosClient.get<Usuario[]>('users/users/');
    return response.data;
  },

  obtener: async (id: number): Promise<Usuario> => {
    const response = await axiosClient.get<Usuario>(`users/users/${id}/`);
    return response.data;
  },

  crear: async (data: Partial<Usuario>): Promise<Usuario> => {
    const response = await axiosClient.post<Usuario>('users/users/', data);
    return response.data;
  },

  actualizar: async (id: number, data: Partial<Usuario>): Promise<Usuario> => {
    const response = await axiosClient.patch<Usuario>(`users/users/${id}/`, data);
    return response.data;
  },

  eliminar: async (id: number): Promise<void> => {
    await axiosClient.delete(`users/users/${id}/`);
  },
};
