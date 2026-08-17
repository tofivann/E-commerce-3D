import axiosClient from './axiosClient';

export interface RegisterData {
  username: string;
  email: string;
  nombre: string;
  password: string;
}

export interface RegisterResponse {
  mensaje: string;
  usuario: {
    username: string;
    email: string;
    nombre: string;
    estado_suscripcion: string;
  };
}

export const userApi = {
  // Petición para registrar un nuevo cliente (Estado pendiente de pago)
  register: async (data: RegisterData): Promise<RegisterResponse> => {
    const response = await axiosClient.post<RegisterResponse>('/users/auth/register/', data);
    return response.data;
  },
};