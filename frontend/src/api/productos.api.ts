import { axiosClient } from "../services/axiosClient";

// 1. Interfaz para mantener el autocompletado y tipado de TypeScript
export interface Producto {
  id?: number;
  titulo: string;
  descripcion: string;
  precio: number | string; // DecimalField llega como string/number desde el JSON
  formato_archivo: string;
  archivo_3d?: File | string; // File cuando se sube desde un input tipo file, string si es la URL
  imagen_previa?: File | string; // File cuando se sube desde un input tipo file, string si es la URL ya guardada
  link_youtube?: string | null; // Video de vista previa del modelo (opcional)
  activo?: boolean;
  fecha_creacion?: string;
}

const BASE = "products/products/";

// 2. Métodos CRUD para Productos (usan la instancia axios compartida — mismo
// VITE_API_URL/JWT que el resto de la app, sin una baseURL propia aparte)

// Obtener todos los productos (catálogo público: solo activos, sin importar quién esté logueado)
export function getAllProductos() {
  return axiosClient.get<Producto[]>(BASE);
}

// Panel admin: incluye también los productos inactivos (solo staff puede pedir esto).
export function getAllProductosAdmin() {
  return axiosClient.get<Producto[]>(BASE, { params: { incluir_inactivos: "true" } });
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
