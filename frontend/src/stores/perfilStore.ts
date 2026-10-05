import { perfilApi } from "../api/perfil.api";
import type { Perfil } from "../api/perfil.api";

// El perfil del usuario con sesión, compartido por toda la app: lo lee la
// cabecera (miniatura junto al carrito) y lo cambia la página "Mi perfil",
// que no son padre e hijo. Un store mínimo fuera de React evita pasar el
// perfil por props a través del layout; los componentes se suscriben con
// el hook usePerfil (hooks/usePerfil.ts).
export interface EstadoPerfil {
  perfil: Perfil | null;
  fase: "vacio" | "cargando" | "listo" | "error";
}

let estado: EstadoPerfil = { perfil: null, fase: "vacio" };
const oyentes = new Set<() => void>();

function publicar(nuevo: EstadoPerfil) {
  estado = nuevo;
  oyentes.forEach((avisar) => avisar());
}

export const perfilStore = {
  leer: (): EstadoPerfil => estado,
  suscribir: (avisar: () => void) => {
    oyentes.add(avisar);
    return () => {
      oyentes.delete(avisar);
    };
  },
  // Pide el perfil al backend, una sola vez mientras haya uno cargado o en camino.
  cargar: () => {
    if (estado.fase === "cargando" || estado.fase === "listo") return;
    publicar({ perfil: null, fase: "cargando" });
    perfilApi
      .obtener()
      .then((perfil) => publicar({ perfil, fase: "listo" }))
      .catch((err) => {
        console.error("Error al cargar el perfil:", err);
        publicar({ perfil: null, fase: "error" });
      });
  },
  // Tras guardar un cambio: el backend devuelve el perfil ya actualizado.
  establecer: (perfil: Perfil) => publicar({ perfil, fase: "listo" }),
  // Al cerrar sesión o al iniciarla con otra cuenta.
  limpiar: () => publicar({ perfil: null, fase: "vacio" }),
};
