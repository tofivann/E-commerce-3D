import { axiosClient } from './axiosClient';

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await axiosClient.post('users/auth/login/', credentials);
    return response.data;
  },

  // NUEVO MÉTODO PARA GOOGLE
  googleLogin: async (data: { token: string }) => {
    const response = await axiosClient.post('users/auth/google/', data);
    return response.data;
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