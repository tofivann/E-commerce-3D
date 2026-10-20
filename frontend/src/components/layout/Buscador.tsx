import React from "react";
import { createPortal } from "react-dom";
import { useNodoBarra } from "./contextoLayout";

// El buscador de la página, colgado en la barra superior del layout (a la
// izquierda). La página lo dibuja como un hijo más, así que el estado (el
// texto buscado) sigue siendo suyo; solo cambia el sitio del DOM. Una página
// sin buscador no lo usa, y sin barra (GuestLayout) no dibuja nada.
export const Buscador: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const nodo = useNodoBarra();
  return nodo ? createPortal(children, nodo) : null;
};
