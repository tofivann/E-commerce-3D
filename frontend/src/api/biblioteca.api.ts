import { axiosClient } from "../services/axiosClient";
import type { Producto } from "./productos.api";
import { descargarConSesion } from "../utils/descarga";

export interface CompraDigital {
  id: number;
  producto: Producto;
  codigo_orden: string;
  activo: boolean;
  fecha_adquisicion: string;
  descarga_url: string;
}

// API de la biblioteca digital: modelos que el usuario ya adquirió
export const bibliotecaApi = {
  listar: async (): Promise<CompraDigital[]> => {
    const { data } = await axiosClient.get<CompraDigital[]>("orders/biblioteca/");
    return data;
  },
};

// Descarga el archivo de una compra (exige sesión: ver utils/descarga.ts)
export async function descargarCompra(compra: CompraDigital): Promise<void> {
  await descargarConSesion(
    `orders/biblioteca/${compra.id}/descargar/`,
    `${compra.producto.titulo}.${(compra.producto.formato_archivo || "3d").toLowerCase()}`
  );
}
