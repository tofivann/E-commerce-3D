import { axiosClient } from "../services/axiosClient";
import type { EstadoSuscripcion, Rol } from "../services/userApi";

// El perfil del propio usuario (`users/me/`). Solo puede cambiar su nombre y
// su foto; el resto es de solo lectura.
export interface Perfil {
  id: number;
  username: string;
  nombre: string;
  email: string;
  rol: Rol;
  is_staff: boolean;
  estado_suscripcion: EstadoSuscripcion;
  idioma: string;
  fecha_registro: string;
  // Dirección de la foto (ya recortada a cuadrado por el backend), o null.
  foto_perfil: string | null;
}

// Mismo límite que el backend (users/perfil.py): se comprueba aquí antes de
// subir para avisar al momento, y allí de todas formas.
export const TAMANO_MAXIMO_FOTO_MB = 5;

const BASE = "users/me/";

export const perfilApi = {
  obtener: async (): Promise<Perfil> => {
    const { data } = await axiosClient.get<Perfil>(BASE);
    return data;
  },
  cambiarNombre: async (nombre: string): Promise<Perfil> => {
    const { data } = await axiosClient.patch<Perfil>(BASE, { nombre });
    return data;
  },
  subirFoto: async (foto: File): Promise<Perfil> => {
    const formData = new FormData();
    formData.append("foto_perfil", foto);
    const { data } = await axiosClient.patch<Perfil>(BASE, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  quitarFoto: async (): Promise<Perfil> => {
    const { data } = await axiosClient.delete<Perfil>(`${BASE}foto/`);
    return data;
  },
};
