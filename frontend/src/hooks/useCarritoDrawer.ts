import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { carritoApi } from "../api/carrito.api";
import type { Producto } from "../api/productos.api";

// Estado del panel del carrito (CartDrawer) y la acción "agregar al carrito"
// de las pantallas que muestran tarjetas de producto: agrega, refresca el
// panel y lo abre. `refreshKey` se le pasa al CartDrawer para que recargue.
export function useCarritoDrawer() {
  const { t } = useTranslation();
  const [abierto, setAbierto] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const agregar = useCallback(
    async (producto: Producto) => {
      if (!producto.id) return;
      try {
        await carritoApi.agregarItem(producto.id);
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
    agregar,
  };
}
