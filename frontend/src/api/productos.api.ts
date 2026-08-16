import axios from "axios";

// 1. Interfaz para mantener el autocompletado y tipado de TypeScript
export interface Producto {
  id?: number;
  titulo: string;
  descripcion: string;
  precio: number | string; // DecimalField llega como string/number desde el JSON
  formato_archivo: string;
  archivo_3d?: File | string; // File cuando se sube desde un input tipo file, string si es la URL
  imagen_previa?: string;
  activo?: boolean;
  fecha_creacion?: string;
}

// 2. Instancia base de Axios apuntando al endpoint de productos
const productosApi = axios.create({
  // Modificamos la URL para que coincida exactamente con tu Django actual
  baseURL: "http://127.0.0.1:8000/api/v1/products/products/",
});

// Interceptor opcional: Adjunta automáticamente el Token JWT si el usuario está autenticado
productosApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // Ajusta según dónde guardes el JWT
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. Métodos CRUD para Productos

// Obtener todos los productos
export function getAllProductos() {
  return productosApi.get<Producto[]>("/");
}

// Obtener un solo producto por ID
export function getProducto(id: string | number) {
  return productosApi.get<Producto>(`/${id}/`);
}

// Crear un producto
// Nota: Si vas a subir archivos reales (archivo_3d), debes pasar un FormData en lugar de un objeto plano
export function createProducto(producto: FormData | Producto) {
  return productosApi.post("/", producto);
}

// Actualizar un producto completo (PUT)
export function updateProducto(
  id: string | number,
  producto: FormData | Producto,
) {
  return productosApi.put(`/${id}/`, producto);
}

// Actualizar un producto parcialmente (PATCH - ej: activar/desactivar)
export function patchProducto(
  id: string | number,
  producto: Partial<Producto>,
) {
  return productosApi.patch(`/${id}/`, producto);
}

// Eliminar un producto
export function deleteProducto(id: string | number) {
  return productosApi.delete(`/${id}/`);
}
