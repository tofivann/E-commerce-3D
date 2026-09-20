import { useCallback, useEffect, useReducer, useRef } from "react";
import type { RespuestaPaginada } from "../api/types";

interface OpcionesListaPaginada<T> {
  // Pide una página concreta. Debe ser estable mientras la consulta no
  // cambie (useCallback) — cuando cambia, la lista vuelve a la página 1.
  cargarPagina: (page: number) => Promise<RespuestaPaginada<T>>;
  // Identifica la consulta actual (filtros serializados). Sirve para saber,
  // en pleno render, si lo que hay en memoria pertenece a esta consulta o
  // a la anterior (y entonces mostrar la lista vacía y cargando).
  clave: string;
  // Id estable de cada elemento, para actualizarlo/quitarlo en memoria sin
  // recargar todas las páginas.
  obtenerId: (item: T) => number | undefined;
}

export interface ListaPaginada<T> {
  items: T[];
  total: number | null;
  // Cargando la primera página de la consulta actual (lista vacía en pantalla).
  cargando: boolean;
  // Cargando una página adicional al final de la lista.
  cargandoMas: boolean;
  error: boolean;
  hayMas: boolean;
  cargarMas: () => void;
  recargar: () => void;
  actualizarItem: (id: number, cambios: Partial<T>) => void;
  eliminarItem: (id: number) => void;
}

interface Estado<T> {
  // Consulta a la que pertenecen items/total/hayMas (null = nada cargado aún).
  consulta: string | null;
  items: T[];
  total: number | null;
  hayMas: boolean;
  cargandoMas: boolean;
  error: boolean;
  // Cambia en recargar(): misma clave, pero se pide todo de nuevo.
  version: number;
}

type Accion<T> =
  | { type: "primera_pagina"; consulta: string; respuesta: RespuestaPaginada<T> }
  | { type: "pagina_adicional"; respuesta: RespuestaPaginada<T> }
  | { type: "cargando_mas" }
  | { type: "error"; consulta: string; esPrimera: boolean }
  | { type: "recargar" }
  | { type: "actualizar"; id: number; cambios: Partial<T>; obtenerId: (item: T) => number | undefined }
  | { type: "eliminar"; id: number; obtenerId: (item: T) => number | undefined };

function reducer<T>(estado: Estado<T>, accion: Accion<T>): Estado<T> {
  switch (accion.type) {
    case "primera_pagina":
      return {
        ...estado,
        consulta: accion.consulta,
        items: accion.respuesta.results,
        total: accion.respuesta.count,
        hayMas: accion.respuesta.next !== null,
        cargandoMas: false,
        error: false,
      };
    case "pagina_adicional":
      return {
        ...estado,
        items: [...estado.items, ...accion.respuesta.results],
        total: accion.respuesta.count,
        hayMas: accion.respuesta.next !== null,
        cargandoMas: false,
        error: false,
      };
    case "cargando_mas":
      return { ...estado, cargandoMas: true, error: false };
    case "error":
      // Un error en la primera página también "asienta" la consulta: así
      // deja de mostrarse el esqueleto de carga y aparece el mensaje.
      return accion.esPrimera
        ? { ...estado, consulta: accion.consulta, items: [], total: null, hayMas: false, cargandoMas: false, error: true }
        : { ...estado, cargandoMas: false, error: true };
    case "recargar":
      return { ...estado, version: estado.version + 1 };
    case "actualizar":
      return {
        ...estado,
        items: estado.items.map((item) =>
          accion.obtenerId(item) === accion.id ? { ...item, ...accion.cambios } : item
        ),
      };
    case "eliminar":
      return {
        ...estado,
        items: estado.items.filter((item) => accion.obtenerId(item) !== accion.id),
        total: estado.total === null ? null : Math.max(0, estado.total - 1),
      };
  }
}

const ESTADO_INICIAL = {
  consulta: null,
  items: [],
  total: null,
  hayMas: false,
  cargandoMas: false,
  error: false,
  version: 0,
};

// Lista acumulativa por páginas (scroll infinito) sobre un endpoint paginado
// del backend. Genérica: no sabe de productos ni de filtros concretos.
export function useListaPaginada<T>({
  cargarPagina,
  clave,
  obtenerId,
}: OpcionesListaPaginada<T>): ListaPaginada<T> {
  const [estado, dispatch] = useReducer(reducer<T>, ESTADO_INICIAL as Estado<T>);

  // Identidad completa de lo que hay que tener cargado: filtros + nº de recarga.
  const consulta = `${clave}#${estado.version}`;
  // Lo que hay en memoria es de otra consulta → se muestra vacío y cargando
  // hasta que llegue su primera página (estado derivado, sin setState extra).
  const alDia = estado.consulta === consulta;
  const cargando = !alDia;

  // Próxima página a pedir y si ya hay una petición en vuelo, fuera del
  // estado de React para que cargarMas() no dispare la misma página dos
  // veces cuando el centinela reentra en pantalla antes de que llegue.
  const siguientePagina = useRef(1);
  const enVuelo = useRef(false);
  // Consulta más reciente: una respuesta que llega después de que la consulta
  // cambió (el usuario siguió escribiendo) se descarta en vez de pisar la nueva.
  const consultaVigente = useRef<string | null>(null);

  const pedir = useCallback(
    async (page: number) => {
      if (enVuelo.current) return;
      enVuelo.current = true;
      const esPrimera = page === 1;
      if (!esPrimera) dispatch({ type: "cargando_mas" });

      try {
        const respuesta = await cargarPagina(page);
        if (consulta !== consultaVigente.current) return;
        dispatch(
          esPrimera
            ? { type: "primera_pagina", consulta, respuesta }
            : { type: "pagina_adicional", respuesta }
        );
        siguientePagina.current = page + 1;
      } catch (err) {
        if (consulta !== consultaVigente.current) return;
        console.error("Error al cargar la lista paginada:", err);
        dispatch({ type: "error", consulta, esPrimera });
      } finally {
        if (consulta === consultaVigente.current) enVuelo.current = false;
      }
    },
    [cargarPagina, consulta]
  );

  useEffect(() => {
    consultaVigente.current = consulta;
    enVuelo.current = false;
    siguientePagina.current = 1;
    pedir(1);
  }, [consulta, pedir]);

  const cargarMas = useCallback(() => {
    if (!alDia || !estado.hayMas) return;
    pedir(siguientePagina.current);
  }, [alDia, estado.hayMas, pedir]);

  const recargar = useCallback(() => dispatch({ type: "recargar" }), []);

  const actualizarItem = useCallback(
    (id: number, cambios: Partial<T>) => dispatch({ type: "actualizar", id, cambios, obtenerId }),
    [obtenerId]
  );

  const eliminarItem = useCallback(
    (id: number) => dispatch({ type: "eliminar", id, obtenerId }),
    [obtenerId]
  );

  return {
    items: alDia ? estado.items : [],
    total: alDia ? estado.total : null,
    cargando,
    cargandoMas: alDia && estado.cargandoMas,
    error: alDia && estado.error,
    hayMas: alDia && estado.hayMas,
    cargarMas,
    recargar,
    actualizarItem,
    eliminarItem,
  };
}
