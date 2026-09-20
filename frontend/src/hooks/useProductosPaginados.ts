import { useCallback } from "react";
import { listarProductos } from "../api/productos.api";
import type { FiltrosProductos, Producto } from "../api/productos.api";
import { useListaPaginada } from "./useListaPaginada";
import type { ListaPaginada } from "./useListaPaginada";

const idDeProducto = (producto: Producto) => producto.id;

// Productos del backend cargados por páginas (scroll infinito) con los
// filtros resueltos en el servidor. Usado por el catálogo público y por las
// dos vistas del panel admin; cualquier cambio en los filtros reinicia la
// lista desde la página 1.
export function useProductosPaginados(filtros: FiltrosProductos): ListaPaginada<Producto> {
  // Filtros normalizados y serializados: es la identidad de la consulta.
  // Ordenar las categorías evita recargar si solo cambió el orden de los chips.
  const clave = JSON.stringify({
    search: filtros.search?.trim() ?? "",
    categorias: [...(filtros.categorias ?? [])].sort((a, b) => a - b),
    incluirInactivos: Boolean(filtros.incluirInactivos),
  } satisfies FiltrosProductos);

  // Depende solo de la clave (de la que se reconstruyen los filtros), así
  // que es estable mientras el usuario no cambie búsqueda/categorías.
  const cargarPagina = useCallback(
    (page: number) => listarProductos(JSON.parse(clave) as FiltrosProductos, page),
    [clave]
  );

  return useListaPaginada<Producto>({ clave, cargarPagina, obtenerId: idDeProducto });
}
