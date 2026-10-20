import { useEffect, useState } from "react";
import { chatApi } from "../services/chatApi";

// Cada cuánto se vuelve a preguntar. El chat abierto ya refresca cada 10 s por
// su cuenta; esto es para el globo del menú, fuera del chat.
const INTERVALO_MS = 30000;

// Evento que dispara ChatPanel cuando abre una conversación (el backend la
// marca como leída en ese momento): el globo baja al instante, sin esperar
// al siguiente intervalo.
export const EVENTO_CHAT_LEIDO = "chat:leido";
export const avisarChatLeido = () => window.dispatchEvent(new Event(EVENTO_CHAT_LEIDO));

// Mensajes de chat sin leer para quien tiene la sesión (ver chat/no-leidos/).
// Pregunta al entrar y cada 30 s, pero solo mientras la pestaña está visible:
// un panel abierto en segundo plano no gasta peticiones. Al volver a la
// pestaña se actualiza enseguida. Con `habilitado=false` no pregunta nunca
// (una cuenta sin acceso al chat).
export function useChatNoLeidos(habilitado: boolean): number {
  const [mensajes, setMensajes] = useState(0);

  useEffect(() => {
    if (!habilitado) return;
    let cancelado = false;
    let temporizador: number | undefined;

    const consultar = async () => {
      try {
        const datos = await chatApi.noLeidos();
        if (!cancelado) setMensajes(datos.mensajes);
      } catch (err) {
        console.error("Error al consultar los mensajes sin leer:", err);
      }
    };
    const programar = () => {
      window.clearInterval(temporizador);
      if (document.visibilityState === "visible") {
        consultar();
        temporizador = window.setInterval(consultar, INTERVALO_MS);
      }
    };

    programar();
    document.addEventListener("visibilitychange", programar);
    window.addEventListener(EVENTO_CHAT_LEIDO, consultar);
    return () => {
      cancelado = true;
      window.clearInterval(temporizador);
      document.removeEventListener("visibilitychange", programar);
      window.removeEventListener(EVENTO_CHAT_LEIDO, consultar);
    };
  }, [habilitado]);

  return habilitado ? mensajes : 0;
}
