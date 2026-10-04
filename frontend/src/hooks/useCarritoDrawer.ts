import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { carritoApi } from "../api/carrito.api";
import type { Carrito } from "../api/carrito.api";
import type { Producto } from "../api/productos.api";

// Todo lo que una pantalla necesita del carrito: el panel (CartDrawer)
// abierto/cerrado, cuántos productos lleva (el contador del icono) y la
// acción "agregar al carrito", que agrega, refresca el panel y lo abre.
//
// `habilitado` = la cuenta puede comprar (acceso al catálogo); sin eso no se
// pide nada y el contador es 0. AppLayout crea el suyo; una página que
// además necesite `agregar` crea uno y se lo pasa al layout, para que el
// icono, el contador y el panel sean los del mismo carrito.
export function useCarritoDrawer(habilitado: boolean) {
  const { t } = useTranslation();
  const [abierto, setAbierto] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cantidad, setCantidad] = useState(0);

  useEffect(() => {
    if (!habilitado) return;
    let vigente = true;
    carritoApi
      .obtener()
      .then((carrito) => {
        if (vigente) setCantidad(carrito.items.length);
      })
      .catch((err) => console.error("Error al cargar el carrito:", err));
    return () => {
      vigente = false;
    };
  }, [habilitado]);

  const agregar = useCallback(
    async (producto: Producto) => {
      if (!producto.id) return;
      try {
        const carrito = await carritoApi.agregarItem(producto.id);
        setCantidad(carrito.items.length);
        setRefreshKey((clave) => clave + 1);
        setAbierto(true);
      } catch (err) {
        console.error("Error al agregar al carrito:", err);
        window.alert(t("cart.addError"));
      }
    },
    [t]
  );

  return {
    abierto,
    abrir: useCallback(() => setAbierto(true), []),
    cerrar: useCallback(() => setAbierto(false), []),
    refreshKey,
    cantidad: habilitado ? cantidad : 0,
    // Para el onCartChange del CartDrawer: mantiene el contador al día cuando
    // el panel carga el carrito o se quita un producto desde él.
    sincronizar: useCallback((carrito: Carrito | null) => setCantidad(carrito?.items.length ?? 0), []),
    agregar,
  };
}

export type CarritoDrawer = ReturnType<typeof useCarritoDrawer>;
