import React, { useEffect, useEffectEvent, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./kit/scene.css";
import "./kit/character.css";
import "./kit/seat.css";
import { cargarKit, RUTA_ASSETS_KIT } from "./cargarKit";
import { escenaStore } from "./escenaStore";
import type { AsientoKit, EscenaKit } from "./kit";
import { vistaDeRuta } from "./rutas";

// Resuelve cuando la página terminó de cargar (o enseguida si ya lo hizo):
// Mimi (~0,8 MB) se pide después de la página y el fondo, para no competir
// con las miniaturas del catálogo por el ancho de banda.
const esperarCargaDePagina = () =>
  new Promise<void>((resolve) => {
    if (document.readyState === "complete") resolve();
    else window.addEventListener("load", () => resolve(), { once: true });
  });

// ¿El puntero está sobre la figura de Mimi? La pintura tiene márgenes
// transparentes a los lados, así que se recorta un poco el rectángulo.
const sobreLaFigura = (figura: Element, x: number, y: number) => {
  const r = figura.getBoundingClientRect();
  const margenX = r.width * 0.18;
  return x > r.left + margenX && x < r.right - margenX && y > r.top + r.height * 0.05 && y < r.bottom;
};

// Mimi reacciona al ratón: guiño al entrar sobre ella, sonrisa mientras el
// cursor sigue encima y, al salir, la expresión que el usuario tenga elegida
// en los controles. Se escucha en todo el documento y se mira la posición
// (igual que hace el kit con la mirada), porque parte del contenido sigue
// por encima de la escena. Devuelve la función que quita los oyentes.
const reaccionarAlRaton = (asiento: AsientoKit, montaje: HTMLElement) => {
  let dentro = false;
  const salir = () => {
    if (!dentro) return;
    dentro = false;
    asiento.setExpression(escenaStore.leer().expresion);
  };
  const mover = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    const figura = montaje.querySelector(".mimi-rig");
    if (!figura || sobreLaFigura(figura, e.clientX, e.clientY) === dentro) return;
    if (dentro) return salir();
    dentro = true;
    asiento.setExpression("happy");
    asiento.setExpression("wink", { duration: 900 });
  };
  document.addEventListener("pointermove", mover, { passive: true });
  document.addEventListener("pointerleave", salir);
  return () => {
    document.removeEventListener("pointermove", mover);
    document.removeEventListener("pointerleave", salir);
  };
};

// Escenario pintado de fondo (cielo, ciudad, la habitación de cada sección y
// Mimi animada), fijo detrás de toda la página. Es el único puente con el kit:
// monta dos <div> vacíos, carga los scripts cuando hace falta, crea la escena
// y la sienta a Mimi, y cambia de habitación al cambiar de ruta. Al desmontar
// lo destruye todo. Quien quiera quitar la escena borra este componente y
// public/mimi/, nada más.
interface EscenaMimiProps {
  // Si la página tiene el menú lateral fijo (AppLayout). Hoy no cambia nada:
  // la escena ocupa siempre todo el ancho y el menú tapa su borde izquierdo
  // (estantería y hiedra). Antes dejaba el hueco del menú (--scene-left) y,
  // al pedir el deseo, el kit lo iba cerrando en 2,4 s: la pintura entera se
  // estiraba cuadro a cuadro y se veía a tirones. Se mantiene la prop por si
  // se quiere volver a ese comportamiento.
  conMenuLateral?: boolean;
}

export const EscenaMimi: React.FC<EscenaMimiProps> = ({ conMenuLateral = false }) => {
  const mundoRef = useRef<HTMLDivElement>(null);
  const mimiRef = useRef<HTMLDivElement>(null);
  const escenaRef = useRef<EscenaKit | null>(null);
  const vista = vistaDeRuta(useLocation().pathname);
  // La escena se crea una vez; esto le da la vista vigente en ese momento sin
  // volver a crearla en cada cambio de ruta.
  const vistaActual = useEffectEvent(() => vista);

  useEffect(() => {
    let cancelado = false;
    let escena: EscenaKit | undefined;
    let asiento: AsientoKit | undefined;
    let quitarRaton: (() => void) | undefined;
    // La escena avisa del cielo de deseos por este evento (burbujea desde su raíz).
    const alCambiarDeseo = (e: Event) => escenaStore.fijarDeseo(Boolean((e as CustomEvent<{ active: boolean }>).detail?.active));
    document.addEventListener("mimi:magic", alCambiarDeseo);
    cargarKit()
      .then(() => {
        if (cancelado || !mundoRef.current || !window.MimiScene) return;
        escena = new window.MimiScene(mundoRef.current, { assets: RUTA_ASSETS_KIT, view: vistaActual(), lighting: 0.5 });
        escenaRef.current = escena;
        escenaStore.registrarEscena(escena);
        return esperarCargaDePagina();
      })
      .then(() => {
        if (cancelado || !escena || !mimiRef.current || !window.MimiSeat) return;
        asiento = new window.MimiSeat(mimiRef.current, { scene: escena, assets: RUTA_ASSETS_KIT, caption: false });
        escenaStore.registrarAsiento(asiento);
        quitarRaton = reaccionarAlRaton(asiento, mimiRef.current);
        // El cielo de deseos (≈1 MB: cometas, constelación, luna) se descarga
        // en segundo plano cuando el navegador está ocioso, ya con Mimi en
        // pantalla: así la estrella responde al instante y sin saltos.
        const precargar = () => {
          if (cancelado || !escena) return;
          escena.cargarEfectos();
          escena.cargarCapas(".mimi-orb--moon");
        };
        if ("requestIdleCallback" in window) window.requestIdleCallback(precargar, { timeout: 8000 });
        else setTimeout(precargar, 4000);
      })
      .catch((error) => console.error("No se pudo montar la escena de Mimi:", error));
    return () => {
      cancelado = true;
      document.removeEventListener("mimi:magic", alCambiarDeseo);
      escenaStore.quitar();
      quitarRaton?.();
      asiento?.destroy();
      escena?.destroy();
      escenaRef.current = null;
    };
  }, []);

  useEffect(() => {
    escenaRef.current?.setView(vista);
  }, [vista]);

  // --scene-left: el hueco que el kit deja a la izquierda para un menú; aquí
  // siempre 0 (ver conMenuLateral). Sin aria-hidden: dentro está el botón de
  // la estrella del pelo de Mimi (el "cielo de deseos"), accesible por teclado.
  return (
    <div className="[--scene-left:0px]" data-con-menu={conMenuLateral || undefined}>
      <div ref={mundoRef} />
      <div ref={mimiRef} />
    </div>
  );
};
