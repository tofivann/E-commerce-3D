import axios from 'axios';

export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Adjunta el JWT guardado en el login a toda petición autenticada.
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token guardado ya expiró (o el backend lo rechaza por cualquier
// motivo), redirige a /login en vez de dejar la app en un estado roto con
// 401 silenciosos en cada petición (ver nota en CLAUDE.md sobre este hueco
// conocido — ACCESS_TOKEN_LIFETIME es de 60 minutos y nunca se usa
// refresh_token automáticamente). Solo aplica cuando la petición rechazada
// SÍ llevaba un Authorization: Bearer — un 401 de credenciales incorrectas
// en el propio formulario de login (que no manda token) no debe redirigir,
// solo debe mostrarse como el error de login normal.
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const llevabaToken = Boolean(error.config?.headers?.Authorization);
    if (error.response?.status === 401 && llevabaToken) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('is_staff');
      localStorage.removeItem('estado_suscripcion');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);