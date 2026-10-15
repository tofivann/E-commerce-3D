import React, { useEffect, useEffectEvent, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./kit/scene.css";
import "./kit/character.css";
import "./kit/seat.css";
import { cargarKit, RUTA_ASSETS_KIT } from "./cargarKit";
import type { AsientoKit, EscenaKit, VistaEscena } from "./kit";

// Habitación y pose de Mimi según la ruta. Lo que no esté aquí usa el
// estudio de la portada.
const VISTA_POR_RUTA: Record<string, VistaEscena> = {
  "/": "home",
  "/favoritos": "favorites",
  "/mimi-gifts": "gifts",
  "/mimicoins": "gifts",
  "/biblioteca": "library",
  "/comisiones": "commissions",
  "/soporte": "chat",
};

const vistaDeRuta = (pathname: string): VistaEscena => VISTA_POR_RUTA[pathname] ?? "home";

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
// cursor sigue encima y cara normal al salir. El contenido de la página está
// por encima de la escena y se queda con los eventos, así que se escucha en
// todo el documento y se mira la posición (igual que hace el kit con la
// mirada). Devuelve la función que quita los oyentes.
const reaccionarAlRaton = (asiento: AsientoKit, montaje: HTMLElement) => {
  let dentro = false;
  const salir = () => {
    if (!dentro) return;
    dentro = false;
    asiento.setExpression("welcome");
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
  // Si la página tiene el menú lateral fijo (AppLayout), la escena empieza a
  // su derecha en escritorio; la portada de visitante no lo tiene.
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
    cargarKit()
      .then(() => {
        if (cancelado || !mundoRef.current || !window.MimiScene) return;
        escena = new window.MimiScene(mundoRef.current, { assets: RUTA_ASSETS_KIT, view: vistaActual(), lighting: 0.5 });
        escenaRef.current = escena;
        return esperarCargaDePagina();
      })
      .then(() => {
        if (cancelado || !escena || !mimiRef.current || !window.MimiSeat) return;
        asiento = new window.MimiSeat(mimiRef.current, { scene: escena, assets: RUTA_ASSETS_KIT, caption: false });
        quitarRaton = reaccionarAlRaton(asiento, mimiRef.current);
      })
      .catch((error) => console.error("No se pudo montar la escena de Mimi:", error));
    return () => {
      cancelado = true;
      quitarRaton?.();
      asiento?.destroy();
      escena?.destroy();
      escenaRef.current = null;
    };
  }, []);

  useEffect(() => {
    escenaRef.current?.setView(vista);
  }, [vista]);

  // --scene-left: el kit deja ese hueco a la izquierda para el menú lateral
  // (w-64 = 256px en escritorio; en móvil el menú es un panel flotante).
  return (
    <div className={conMenuLateral ? "[--scene-left:0px] md:[--scene-left:256px]" : "[--scene-left:0px]"} aria-hidden="true">
      <div ref={mundoRef} />
      <div ref={mimiRef} />
    </div>
  );
};
