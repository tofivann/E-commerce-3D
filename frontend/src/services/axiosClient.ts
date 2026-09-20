import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1/';

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
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

// El backend rechazó el refresh token (vencido, en lista negra, inexistente):
// la sesión terminó de verdad. Se distingue de un fallo de red o un 5xx,
// donde el refresh token puede seguir siendo válido y NO hay que borrarlo.
class SesionExpiradaError extends Error {
  constructor(causa?: unknown) {
    super('La sesión expiró y no se pudo renovar.', { cause: causa });
    this.name = 'SesionExpiradaError';
  }
}

// Nombre del lock compartido entre pestañas del mismo origen (Web Locks
// API). Con ROTATE_REFRESH_TOKENS + lista negra en el backend, si dos
// pestañas renovaran a la vez con el mismo refresh token, la segunda
// recibiría "en lista negra" y cerraría la sesión de las dos.
const LOCK_RENOVACION = 'mimimmdart-renovar-sesion';

async function renovarAccessToken(tokenFallido: string): Promise<string> {
  const renovar = async (): Promise<string> => {
    // Si el access token guardado ya no es el que falló, alguien (otra
    // pestaña, o esta misma mientras se esperaba el lock) ya renovó: se usa
    // ese sin gastar el refresh token otra vez.
    const accessActual = localStorage.getItem('access_token');
    if (accessActual && accessActual !== tokenFallido) return accessActual;

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new SesionExpiradaError();

    try {
      // axios "pelado" (no axiosClient) a propósito: usar axiosClient aquí
      // volvería a pasar por el interceptor de respuesta si esta llamada
      // también da 401, causando un loop.
      const { data } = await axios.post(`${API_BASE_URL}users/auth/refresh/`, { refresh: refreshToken });

      localStorage.setItem('access_token', data.access);
      if (data.refresh) {
        // ROTATE_REFRESH_TOKENS está activo en el backend: cada renovación
        // devuelve un refresh_token nuevo e invalida el viejo — hay que
        // guardarlo siempre, si no la SIGUIENTE renovación fallaría.
        localStorage.setItem('refresh_token', data.refresh);
      }
      return data.access;
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 401 || status === 400) throw new SesionExpiradaError(err);
      // Sin conexión, timeout, 5xx: la sesión sigue en pie, solo falló este intento.
      throw err;
    }
  };

  return 'locks' in navigator ? navigator.locks.request(LOCK_RENOVACION, renovar) : renovar();
}

// Una sola renovación en curso por pestaña: si varias peticiones fallan casi
// a la vez con 401 (ej. una página que dispara varios fetch juntos), todas
// esperan la misma promesa en vez de llamar a /auth/refresh/ por cabeza, y
// si esa renovación falla, todas fallan (ninguna queda colgada).
let renovacionEnCurso: Promise<string> | null = null;

function obtenerAccessTokenRenovado(tokenFallido: string): Promise<string> {
  if (!renovacionEnCurso) {
    renovacionEnCurso = renovarAccessToken(tokenFallido).finally(() => {
      renovacionEnCurso = null;
    });
  }
  return renovacionEnCurso;
}

interface PeticionReintentable extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Cuando el access token expira (cada 60 min) llega un 401 — antes de
// mandar a /login de una, se intenta renovar con el refresh_token guardado
// (dura 1 día sin "Mantener sesión abierta" marcado en el login, o 7 días
// si sí se marcó — ver users/tokens.py en el backend). Solo si el backend
// rechaza esa renovación se limpia la sesión y se redirige de verdad.
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || !error.config) return Promise.reject(error);

    const originalRequest = error.config as PeticionReintentable;
    const authHeader = originalRequest.headers?.Authorization;
    const tokenFallido = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';

    // Solo se renueva si la petición iba autenticada (un 401 del formulario
    // de login por credenciales incorrectas no es una sesión vencida) y no
    // se reintentó ya una vez (evita un loop si el token "nuevo" también
    // vuelve a dar 401 por cualquier otro motivo).
    if (error.response?.status !== 401 || !tokenFallido || originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    try {
      const nuevoToken = await obtenerAccessTokenRenovado(tokenFallido);
      originalRequest.headers.Authorization = `Bearer ${nuevoToken}`;
      return axiosClient(originalRequest);
    } catch (err) {
      if (err instanceof SesionExpiradaError) limpiarSesionYRedirigir();
      return Promise.reject(err);
    }
  }
);
