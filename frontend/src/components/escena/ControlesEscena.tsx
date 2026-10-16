import React, { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { IconoCorazon, IconoEstrella, IconoLuna, IconoMas, IconoSonrisa } from "../ui/IconosKit";
import { escenaStore } from "./escenaStore";
import type { ClimaEscena, ExpresionMimi } from "./kit";

// Los 5 botones de expresión del kit, con su icono.
const EXPRESIONES: { nombre: ExpresionMimi; Icono: React.FC<{ className?: string }> }[] = [
  { nombre: "welcome", Icono: IconoSonrisa },
  { nombre: "happy", Icono: IconoCorazon },
  { nombre: "excited", Icono: IconoMas },
  { nombre: "sleepy", Icono: IconoLuna },
  { nombre: "wink", Icono: IconoEstrella },
];

// Hora del día: el botón va pasando de una a otra. Los valores son los del
// kit ("Morning light" < .26, "Pink sunset" < .76, "After hours").
const HORAS: { nombre: "manana" | "atardecer" | "noche"; luz: number; icono: string }[] = [
  { nombre: "manana", luz: 0.15, icono: "wb_sunny" },
  { nombre: "atardecer", luz: 0.5, icono: "wb_twilight" },
  { nombre: "noche", luz: 0.9, icono: "bedtime" },
];

const CLIMAS: { nombre: ClimaEscena; icono: string }[] = [
  { nombre: "clear", icono: "sunny" },
  { nombre: "rain", icono: "rainy" },
  { nombre: "snow", icono: "ac_unit" },
  { nombre: "storm", icono: "thunderstorm" },
];

const horaActual = (luz: number) => HORAS.reduce((mejor, h) => (Math.abs(h.luz - luz) < Math.abs(mejor.luz - luz) ? h : mejor));

const boton =
  "flex h-10 w-10 items-center justify-center rounded-full border shadow-[0_3px_10px_#48344c25] transition-colors md:h-11 md:w-11";
const botonNormal = `${boton} border-linea-papel bg-papel-suave/90 text-malva backdrop-blur hover:bg-papel hover:text-vino`;
const botonActivo = `${boton} border-vino bg-vino text-on-primary`;

// Botonera del costado derecho (como en el kit): la expresión de Mimi, la
// hora del día y el clima. Solo aparece cuando hay escena montada (nunca en
// el admin). Lo que cambia lo guarda escenaStore.
export const ControlesEscena: React.FC = () => {
  const { t } = useTranslation();
  const { escena, luz, clima, expresion } = useSyncExternalStore(escenaStore.suscribir, escenaStore.leer);
  if (!escena) return null;

  const hora = horaActual(luz);
  const siguienteHora = HORAS[(HORAS.findIndex((h) => h === hora) + 1) % HORAS.length];
  const siguienteClima = CLIMAS[(CLIMAS.findIndex((c) => c.nombre === clima) + 1) % CLIMAS.length];

  return (
    <aside
      className="oculto-en-deseo fixed right-2 top-[42%] z-20 flex -translate-y-1/2 flex-col gap-2 md:right-4"
      aria-label={t("escena.titulo")}
    >
      {EXPRESIONES.map(({ nombre, Icono }) => (
        <button
          key={nombre}
          type="button"
          onClick={() => escenaStore.fijarExpresion(nombre)}
          aria-pressed={expresion === nombre}
          aria-label={t(`escena.expresion.${nombre}`)}
          title={t(`escena.expresion.${nombre}`)}
          className={expresion === nombre ? botonActivo : botonNormal}
        >
          <Icono className="h-5 w-5" />
        </button>
      ))}

      <span className="mx-auto my-1 h-px w-6 bg-linea-papel" aria-hidden="true" />

      <button
        type="button"
        onClick={() => escenaStore.fijarLuz(siguienteHora.luz)}
        aria-label={t("escena.cambiarHora", { actual: t(`escena.hora.${hora.nombre}`), siguiente: t(`escena.hora.${siguienteHora.nombre}`) })}
        title={t("escena.cambiarHora", { actual: t(`escena.hora.${hora.nombre}`), siguiente: t(`escena.hora.${siguienteHora.nombre}`) })}
        className={botonNormal}
      >
        <span className="material-symbols-outlined text-[22px]">{hora.icono}</span>
      </button>
      <button
        type="button"
        onClick={() => escenaStore.fijarClima(siguienteClima.nombre)}
        aria-label={t("escena.cambiarClima", { actual: t(`escena.clima.${clima}`), siguiente: t(`escena.clima.${siguienteClima.nombre}`) })}
        title={t("escena.cambiarClima", { actual: t(`escena.clima.${clima}`), siguiente: t(`escena.clima.${siguienteClima.nombre}`) })}
        className={clima === "clear" ? botonNormal : botonActivo}
      >
        <span className="material-symbols-outlined text-[22px]">{CLIMAS.find((c) => c.nombre === clima)?.icono}</span>
      </button>
    </aside>
  );
};
