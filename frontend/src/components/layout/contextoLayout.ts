import { createContext, useContext } from "react";
import type { CarritoDrawer } from "../../hooks/useCarritoDrawer";

// Lo que el layout (montado una sola vez en App.tsx) comparte con la página
// que dibuja dentro de su <Outlet />: el carrito —uno solo, para que el icono,
// el contador y el panel sean los mismos que usa "agregar al carrito"— y el
// hueco de la barra superior donde la página cuelga su buscador (Buscador).
export interface ValoresLayout {
  carrito: CarritoDrawer;
  // null mientras el layout no ha dibujado la barra (y siempre en GuestLayout).
  nodoBarra: HTMLElement | null;
}

export const ContextoLayout = createContext<ValoresLayout | null>(null);

function useValoresLayout(): ValoresLayout {
  const valores = useContext(ContextoLayout);
  if (!valores) throw new Error("Esta página tiene que dibujarse dentro de AppLayout o GuestLayout (ver App.tsx).");
  return valores;
}

export const useCarritoLayout = () => useValoresLayout().carrito;
export const useNodoBarra = () => useValoresLayout().nodoBarra;
