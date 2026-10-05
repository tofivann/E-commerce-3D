import { axiosClient } from './axiosClient';

// Lo que el usuario escribe en el formulario de registro.
export interface DatosRegistro {
  username: string;
  email: string;
  nombre: string;
  password: string;
}

// El registro exige además el código que se mandó a su correo.
export interface RegisterData extends DatosRegistro {
  codigo: string;
}

export interface CodigoEnviado {
  email: string;
  vigencia_minutos: number;
  // Tiempo mínimo antes de poder pedir otro código.
  espera_segundos: number;
}

// Por qué el servidor rechazó un código (users/verificacion.py, MOTIVO_*).
export type MotivoCodigoInvalido = 'incorrecto' | 'expirado' | 'demasiados_intentos';

export interface PrecioSuscripcion {
  precio: string;
  moneda: string;
}

export interface RegisterResponse {
  mensaje: string;
  email: string;
  estado_suscripcion: string;
  checkout_url: string
}

export interface RegisterPayPalResponse {
  mensaje: string;
  email: string;
  estado_suscripcion: string;
  paypal_order_id: string;
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
  // Solo lectura: la cambia cada usuario desde "Mi perfil".
  foto_perfil?: string | null;
}

export const userApi = {
  // Registro, paso 1: valida los datos y manda un código al correo (también
  // sirve para reenviarlo). No crea la cuenta.
  solicitarCodigoRegistro: async (data: DatosRegistro): Promise<CodigoEnviado> => {
    const response = await axiosClient.post<CodigoEnviado>('users/auth/register/codigo/', data);
    return response.data;
  },

  // Registro, paso 2: comprueba el código que el usuario escribió.
  verificarCodigoRegistro: async (email: string, codigo: string): Promise<void> => {
    await axiosClient.post('users/auth/register/verificar-codigo/', { email, codigo });
  },

  precioSuscripcion: async (): Promise<PrecioSuscripcion> => {
    const response = await axiosClient.get<PrecioSuscripcion>('users/suscripcion/precio/');
    return response.data;
  },

  // Registro, paso 3: crea la cuenta y abre el pago (Stripe o PayPal).
  register: async (data: RegisterData): Promise<RegisterResponse> => {
    const response = await axiosClient.post<RegisterResponse>('users/auth/register/', data);
    return response.data;
  },

  registerPayPal: async (data: RegisterData): Promise<RegisterPayPalResponse> => {
    const response = await axiosClient.post<RegisterPayPalResponse>('users/auth/register-paypal/', data);
    return response.data;
  },

  // CRUD de usuarios
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

  activarCuenta: async (): Promise<{ checkout_url: string }> => {
    const response = await axiosClient.post<{ checkout_url: string }>('users/activar-cuenta-pago/');
    return response.data;
  },

  activarCuentaPayPal: async (): Promise<{ paypal_order_id: string }> => {
    const response = await axiosClient.post<{ paypal_order_id: string }>('users/activar-cuenta-pago-paypal/');
    return response.data;
  },

  // Consulta el estado real de la suscripción tras volver de Stripe (registro o
  // activación de cuenta), en vez de asumir éxito solo por haber vuelto del checkout.
  verificarPago: async (
    sessionId: string,
  ): Promise<{ payment_status: string; estado_suscripcion: EstadoSuscripcion }> => {
    const response = await axiosClient.get('users/verificar-pago/', {
      params: { session_id: sessionId },
    });
    return response.data;
  },
};