import type { AsientoKit, ClimaEscena, EscenaKit, ExpresionMimi } from "./kit";

// Estado compartido de la escena: las instancias vivas del kit (las registra
// EscenaMimi) y el ambiente elegido por el usuario (hora, clima, expresión),
// para que ControlesEscena pueda cambiarlo desde fuera. Hora y clima se
// guardan en localStorage porque la escena se vuelve a crear al cambiar de
// página y el usuario espera que su noche con nieve siga ahí.

export interface EstadoEscena {
  escena: EscenaKit | null;
  asiento: AsientoKit | null;
  // 0 = mañana, 0.5 = atardecer rosa (la del kit), 1 = noche.
  luz: number;
  clima: ClimaEscena;
  // Expresión base: la que Mimi mantiene y a la que vuelve tras un guiño.
  expresion: ExpresionMimi;
  // "Cielo de deseos" en marcha: la interfaz se desvanece (ver .oculto-en-deseo).
  deseo: boolean;
}

const CLAVE_AMBIENTE = "mimi-ambiente";
const CLIMAS: ClimaEscena[] = ["clear", "rain", "snow", "storm"];

const leerAmbiente = (): Pick<EstadoEscena, "luz" | "clima"> => {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_AMBIENTE) ?? "{}");
    const luz = Number(guardado.luz);
    return {
      luz: Number.isFinite(luz) ? Math.min(1, Math.max(0, luz)) : 0.5,
      clima: CLIMAS.includes(guardado.clima) ? guardado.clima : "clear",
    };
  } catch {
    return { luz: 0.5, clima: "clear" };
  }
};

const guardarAmbiente = ({ luz, clima }: Pick<EstadoEscena, "luz" | "clima">) => {
  try {
    localStorage.setItem(CLAVE_AMBIENTE, JSON.stringify({ luz, clima }));
  } catch {
    /* sin almacenamiento (modo privado): el ambiente dura lo que la página */
  }
};

let estado: EstadoEscena = { escena: null, asiento: null, ...leerAmbiente(), expresion: "welcome", deseo: false };

// El CSS (index.css, .oculto-en-deseo) lee este atributo para desvanecer la
// interfaz mientras dura el deseo.
const marcarDeseo = (activo: boolean) => {
  document.documentElement.dataset.deseo = String(activo);
};
const oyentes = new Set<() => void>();

const publicar = (cambios: Partial<EstadoEscena>) => {
  estado = { ...estado, ...cambios };
  oyentes.forEach((avisar) => avisar());
};

export const escenaStore = {
  suscribir: (avisar: () => void) => {
    oyentes.add(avisar);
    return () => {
      oyentes.delete(avisar);
    };
  },
  leer: () => estado,

  // EscenaMimi acaba de crear la escena: se le aplica el ambiente guardado.
  registrarEscena: (escena: EscenaKit) => {
    escena.setLighting(estado.luz);
    escena.setWeather(estado.clima);
    publicar({ escena });
  },
  registrarAsiento: (asiento: AsientoKit) => {
    asiento.setExpression(estado.expresion);
    publicar({ asiento });
  },
  // EscenaMimi se desmonta: las instancias ya no valen, el ambiente sí.
  quitar: () => {
    marcarDeseo(false);
    publicar({ escena: null, asiento: null, deseo: false });
  },

  // Lo avisa la escena (evento mimi:magic) al empezar y al acabar el deseo.
  fijarDeseo: (deseo: boolean) => {
    if (deseo === estado.deseo) return;
    marcarDeseo(deseo);
    publicar({ deseo });
  },
  // El botón "Volver al atelier" (o Escape): corta el deseo antes de tiempo.
  volverDelDeseo: () => estado.escena?.clearStars(),

  fijarLuz: (luz: number) => {
    estado.escena?.setLighting(luz);
    guardarAmbiente({ luz, clima: estado.clima });
    publicar({ luz });
  },
  fijarClima: (clima: ClimaEscena) => {
    estado.escena?.setWeather(clima);
    guardarAmbiente({ luz: estado.luz, clima });
    publicar({ clima });
  },
  fijarExpresion: (expresion: ExpresionMimi) => {
    estado.asiento?.setExpression(expresion);
    publicar({ expresion });
  },
};
