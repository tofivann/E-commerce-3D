import { axiosClient } from "../services/axiosClient";
import type { RespuestaPaginada } from "./types";

export interface Categoria {
  id: number;
  nombre: string;
  nombre_en: string;
  activo: boolean;
}

// 1. Interfaz para mantener el autocompletado y tipado de TypeScript
export interface Producto {
  id?: number;
  titulo: string;
  descripcion: string;
  precio: number | string; // DecimalField llega como string/number desde el JSON
  categorias: number[]; // ids de las Categorias (PrimaryKeyRelatedField many=True, tanto al leer como al escribir)
  categorias_detalle?: Categoria[]; // solo lectura, para mostrar sin tener que cruzar con la lista de categorías
  formato_archivo: string;
  archivo_3d?: File | string; // File cuando se sube desde un input tipo file, string si es la URL
  imagen_previa?: File | string; // File cuando se sube desde un input tipo file, string si es la URL ya guardada
  link_youtube?: string | null; // Video de vista previa del modelo (opcional)
  activo?: boolean;
  fecha_creacion?: string;
}

const BASE = "products/products/";
const CATEGORIAS_BASE = "products/categorias/";

export const categoriasApi = {
  listar: async (): Promise<Categoria[]> => {
    const { data } = await axiosClient.get<Categoria[]>(CATEGORIAS_BASE);
    return data;
  },
  crear: async (payload: { nombre: string; nombre_en: string; activo: boolean }): Promise<Categoria> => {
    const { data } = await axiosClient.post<Categoria>(CATEGORIAS_BASE, payload);
    return data;
  },
  actualizar: async (id: number, payload: Partial<Categoria>): Promise<Categoria> => {
    const { data } = await axiosClient.patch<Categoria>(`${CATEGORIAS_BASE}${id}/`, payload);
    return data;
  },
  eliminar: async (id: number): Promise<void> => {
    await axiosClient.delete(`${CATEGORIAS_BASE}${id}/`);
  },
};

// 2. Métodos CRUD para Productos (usan la instancia axios compartida — mismo
// VITE_API_URL/JWT que el resto de la app, sin una baseURL propia aparte)

export interface FiltrosProductos {
  // Texto libre; el backend busca en título y descripción sin distinguir acentos ni mayúsculas.
  search?: string;
  // Ids de categorías: coincide con cualquiera de ellas. Vacío = todas.
  categorias?: number[];
  // Solo tiene efecto para staff (panel admin); el catálogo público siempre ve solo activos.
  incluirInactivos?: boolean;
}

// Listado paginado (50 por página, ver core/pagination.py). La búsqueda y el
// filtro por categoría se resuelven en el servidor: como el cliente solo
// tiene cargadas las páginas que ya pidió, filtrar en memoria solo vería esa
// parte y daría resultados incompletos.
export async function listarProductos(
  filtros: FiltrosProductos = {},
  page = 1,
): Promise<RespuestaPaginada<Producto>> {
  const { data } = await axiosClient.get<RespuestaPaginada<Producto>>(BASE, {
    params: {
      page,
      search: filtros.search?.trim() || undefined,
      categorias: filtros.categorias?.length ? filtros.categorias.join(",") : undefined,
      incluir_inactivos: filtros.incluirInactivos ? "true" : undefined,
    },
  });
  return data;
}

// Obtener un solo producto por ID
export function getProducto(id: string | number) {
  return axiosClient.get<Producto>(`${BASE}${id}/`);
}

// axiosClient fija Content-Type: application/json por defecto (bien para el
// resto de la app); cuando el body es FormData (subida de archivos) hay que
// pisarlo, mismo patrón que ya usa comisiones.api.ts.
const formDataConfig = (producto: FormData | unknown) =>
  producto instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;

// Crear un producto
// Nota: Si vas a subir archivos reales (archivo_3d), debes pasar un FormData en lugar de un objeto plano
export function createProducto(producto: FormData | Producto) {
  return axiosClient.post(BASE, producto, formDataConfig(producto));
}

// Actualizar un producto completo (PUT)
export function updateProducto(
  id: string | number,
  producto: FormData | Producto,
) {
  return axiosClient.put(`${BASE}${id}/`, producto, formDataConfig(producto));
}

// Actualizar un producto parcialmente (PATCH - ej: activar/desactivar, o editar sin reenviar los archivos)
export function patchProducto(
  id: string | number,
  producto: FormData | Partial<Producto>,
) {
  return axiosClient.patch(`${BASE}${id}/`, producto, formDataConfig(producto));
}

// Eliminar un producto
export function deleteProducto(id: string | number) {
  return axiosClient.delete(`${BASE}${id}/`);
}
