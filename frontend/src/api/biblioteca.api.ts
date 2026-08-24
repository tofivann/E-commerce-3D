import { axiosClient } from "../services/axiosClient";
import type { Producto } from "./productos.api";

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

// Descarga el archivo de una compra (requiere el JWT, por eso no se usa un <a href> plano)
export async function descargarCompra(compra: CompraDigital): Promise<void> {
  const response = await axiosClient.get(`orders/biblioteca/${compra.id}/descargar/`, {
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename =
    match?.[1] ||
    `${compra.producto.titulo}.${(compra.producto.formato_archivo || "3d").toLowerCase()}`;

  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
