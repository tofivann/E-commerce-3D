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

export interface EscenaKit {
  setView(vista: VistaEscena): void;
  setLighting(valor: number): void;
  setWeather(clima: "clear" | "rain" | "snow" | "storm"): void;
  setPaused(pausada: boolean): void;
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
