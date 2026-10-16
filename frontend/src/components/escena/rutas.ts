import type { VistaEscena } from "./kit";

// Única lista de las páginas que llevan la escena de Mimi y qué habitación
// (pose) usa cada una. App.tsx la consulta para montar la escena y EscenaMimi
// para elegir la habitación. Login, registro, pagos, legales y el admin no
// están aquí: no llevan escena. Al crear una sección nueva, añádela aquí.
const VISTA_POR_RUTA: Record<string, VistaEscena> = {
  "/": "home",
  "/perfil": "home",
  "/favoritos": "favorites",
  "/mimi-gifts": "gifts",
  "/mimicoins": "gifts",
  "/biblioteca": "library",
  "/comisiones": "commissions",
  "/soporte": "chat",
  // Novedades usa la habitación "catalog" del kit, que ninguna otra ruta ocupa.
  "/novedades": "catalog",
};

export const tieneEscena = (pathname: string) => Object.prototype.hasOwnProperty.call(VISTA_POR_RUTA, pathname);

export const vistaDeRuta = (pathname: string): VistaEscena => VISTA_POR_RUTA[pathname] ?? "home";
