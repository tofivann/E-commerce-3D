import { useEffect, useSyncExternalStore } from "react";
import { perfilStore } from "../stores/perfilStore";
import type { EstadoPerfil } from "../stores/perfilStore";

// Perfil del usuario con sesión. Lo carga la primera vez que algún
// componente lo necesita y avisa a todos cuando cambia (p. ej. la cabecera
// se entera sola de que se subió una foto nueva en "Mi perfil").
// `habilitado=false` no lo pide (un visitante sin sesión recibiría un 401).
export function usePerfil(habilitado = true): EstadoPerfil {
  const estado = useSyncExternalStore(perfilStore.suscribir, perfilStore.leer);

  useEffect(() => {
    if (habilitado && estado.fase === "vacio") perfilStore.cargar();
  }, [habilitado, estado.fase]);

  return estado;
}
