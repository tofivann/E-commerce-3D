import { axiosClient } from "../services/axiosClient";
import type { Producto } from "./productos.api";
import type { RespuestaPaginada } from "./types";

// Favoritos del usuario con sesión: productos que guardó con el corazón.
// Solo para cuentas con acceso al catálogo (el backend responde 403 al resto).
const BASE = "products/favoritos/";

export const favoritosApi = {
  // Página de productos favoritos, del más reciente al más antiguo.
  listar: async (page = 1): Promise<RespuestaPaginada<Producto>> => {
    const { data } = await axiosClient.get<RespuestaPaginada<Producto>>(BASE, { params: { page } });
    return data;
  },
  // Solo los ids: lo que necesita el catálogo para pintar cada corazón.
  listarIds: async (): Promise<number[]> => {
    const { data } = await axiosClient.get<number[]>(`${BASE}ids/`);
    return data;
  },
  // Ambas son idempotentes en el backend: repetirlas no da error.
  agregar: async (productoId: number): Promise<void> => {
    await axiosClient.put(`${BASE}${productoId}/`);
  },
  quitar: async (productoId: number): Promise<void> => {
    await axiosClient.delete(`${BASE}${productoId}/`);
  },
};
