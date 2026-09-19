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

function limpiarSesionYRedirigir() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('is_staff');
  localStorage.removeItem('estado_suscripcion');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

// Cuando el access token expira (cada 60 min) llega un 401 — antes de
// mandar a /login de una, se intenta renovar con el refresh_token guardado
// (dura 1 día sin "Mantener sesión abierta" marcado en el login, o 7 días
// si sí se marcó — ver CustomTokenObtainPairSerializer en el backend). Solo
// si ese refresh también falla (el refresh_token también expiró, o nunca
// hubo uno) se limpia la sesión y se redirige de verdad.
let refrescando = false;
let peticionesEnEspera: ((token: string) => void)[] = [];

function avisarCuandoHayaToken(cb: (token: string) => void) {
  peticionesEnEspera.push(cb);
}

function notificarNuevoToken(token: string) {
  peticionesEnEspera.forEach((cb) => cb(token));
  peticionesEnEspera = [];
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const llevabaToken = Boolean(originalRequest?.headers?.Authorization);

    // !originalRequest._retry evita un loop infinito si la petición YA se
    // reintentó una vez con un token "nuevo" y aun así volvió a dar 401 (el
    // refresh_token también venció, o el backend rechaza por otro motivo).
    if (error.response?.status !== 401 || !llevabaToken || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      limpiarSesionYRedirigir();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Si ya hay una renovación en curso (varias peticiones fallaron casi a
    // la vez, ej. al cargar una página que dispara varios fetch juntos), las
    // demás esperan a que termine esa única renovación en vez de disparar
    // una llamada a /auth/refresh/ por cada una.
    if (refrescando) {
      return new Promise((resolve) => {
        avisarCuandoHayaToken((nuevoToken) => {
          originalRequest.headers.Authorization = `Bearer ${nuevoToken}`;
          resolve(axiosClient(originalRequest));
        });
      });
    }

    refrescando = true;
    try {
      const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1/';
      // axios "pelado" (no axiosClient) a propósito: usar axiosClient aquí
      // volvería a pasar por este mismo interceptor si esta llamada también
      // da 401, causando un loop.
      const { data } = await axios.post(`${baseURL}users/auth/refresh/`, { refresh: refreshToken });

      localStorage.setItem('access_token', data.access);
      if (data.refresh) {
        // ROTATE_REFRESH_TOKENS está activo en el backend: cada renovación
        // devuelve un refresh_token nuevo y invalida el viejo — hay que
        // guardarlo siempre, si no la SIGUIENTE renovación fallaría.
        localStorage.setItem('refresh_token', data.refresh);
      }

      refrescando = false;
      notificarNuevoToken(data.access);

      originalRequest.headers.Authorization = `Bearer ${data.access}`;
      return axiosClient(originalRequest);
    } catch (refreshError) {
      refrescando = false;
      peticionesEnEspera = [];
      limpiarSesionYRedirigir();
      return Promise.reject(refreshError);
    }
  }
);