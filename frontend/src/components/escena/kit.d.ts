// Tipos mínimos de los scripts del kit "rooftop atelier" (public/mimi/js),
// que no son módulos: cuelgan sus clases en window. Solo lo que usa
// EscenaMimi; el resto de la API está en MimiMMDArt-v5-FIXED/docs/INTEGRATION.md.

export type VistaEscena =
  | "home"
  | "catalog"
  | "favorites"
  | "gifts"
  | "library"
  | "commissions"
  | "chat";

export type ClimaEscena = "clear" | "rain" | "snow" | "storm";

export interface EscenaKit {
  setView(vista: VistaEscena): void;
  // 0 = mañana, 0.5 = atardecer, 1 = noche.
  setLighting(valor: number): void;
  setWeather(clima: ClimaEscena): void;
  setPaused(pausada: boolean): void;
  // Termina el "cielo de deseos" (lo inicia la estrella del pelo de Mimi).
  // La escena avisa del inicio y el fin con el evento `mimi:magic`
  // ({ detail: { active } }), que burbujea hasta document.
  clearStars(): void;
  // Añadido por nosotros en mimi-scene.js: descarga las imágenes del cielo
  // de deseos (cometas, constelación, luna) sin mostrarlas, para que el
  // primer clic en la estrella no las pida a medio fundido.
  cargarEfectos(): void;
  cargarCapas(selector: string): void;
  destroy(): void;
}

export type ExpresionMimi = "welcome" | "happy" | "excited" | "wink" | "sleepy";

export interface AsientoKit {
  setPose(vista: VistaEscena | "standing"): void;
  // Sin `duration` la expresión se queda; con ella vuelve sola a la anterior.
  setExpression(nombre: ExpresionMimi, opciones?: { duration?: number }): void;
  destroy(): void;
}

interface OpcionesEscena {
  assets: string;
  view?: VistaEscena;
  lighting?: number;
}

interface OpcionesAsiento {
  assets: string;
  scene: EscenaKit;
  caption?: string | false;
}

declare global {
  interface Window {
    MimiScene?: new (raiz: HTMLElement, opciones: OpcionesEscena) => EscenaKit;
    MimiSeat?: new (raiz: HTMLElement, opciones: OpcionesAsiento) => AsientoKit;
  }
}
