import { axiosClient } from './axiosClient';

export const authApi = {
  login: async (credentials: { email: string; password: string; remember_me?: boolean }) => {
    const response = await axiosClient.post('users/auth/login/', credentials);
    return response.data;
  },

  // Mismo checkbox "Mantener sesión abierta" que el login por contraseña.
  googleLogin: async (data: { token: string; remember_me?: boolean }) => {
    const response = await axiosClient.post('users/auth/google/', data);
    return response.data;
  },

  // Manda el refresh token a la lista negra del backend: sin esto, cerrar
  // sesión solo lo borraba del navegador y seguía siendo válido hasta 7 días.
  logout: async (refreshToken: string) => {
    await axiosClient.post('users/auth/logout/', { refresh: refreshToken });
  },

  solicitarResetPassword: async (email: string) => {
    const response = await axiosClient.post('users/auth/solicitar-password/', { email });
    return response.data;
  },

  confirmarResetPassword: async (data: { uid: string; token: string; nueva_password: string }) => {
    const response = await axiosClient.post('users/auth/confirmar-password/', data);
    return response.data;
  },
};