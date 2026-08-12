import { axiosClient } from './axiosClient';

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await axiosClient.post('users/auth/login/', credentials);
    return response.data;
  },
};