// Forma de respuesta de los listados paginados del backend
// (core/pagination.py::PaginacionEstandar): ?page=N devuelve una página y
// `next`/`previous` traen la URL completa de la siguiente/anterior, o null.
export interface RespuestaPaginada<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
