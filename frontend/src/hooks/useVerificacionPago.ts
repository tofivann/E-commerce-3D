import { useEffect, useRef, useState } from "react";
import { userApi } from "../services/userApi";

const MAX_INTENTOS = 10; // ~15s de espera al webhook antes de rendirnos
const INTERVALO_MS = 1500;

export type EstadoVerificacionPago = "cargando" | "activo" | "expirado" | "error";

// Sondea el backend hasta confirmar que la suscripción quedó ACTIVO tras un
// pago con Stripe (registro nuevo o activación de cuenta pendiente), en vez
// de asumir éxito solo porque el navegador volvió del checkout.
export function useVerificacionPago(sessionId: string | null): EstadoVerificacionPago {
  const [estado, setEstado] = useState<EstadoVerificacionPago>(sessionId ? "cargando" : "error");
  const intentos = useRef(0);

  useEffect(() => {
    if (!sessionId) {
      setEstado("error");
      return;
    }

    let cancelado = false;
    intentos.current = 0;
    setEstado("cargando");

    const consultar = async () => {
      try {
        const data = await userApi.verificarPago(sessionId);
        if (cancelado) return;

        if (data.estado_suscripcion === "ACTIVO") {
          setEstado("activo");
          return;
        }

        intentos.current += 1;
        if (intentos.current >= MAX_INTENTOS) {
          setEstado("expirado");
          return;
        }
        setTimeout(consultar, INTERVALO_MS);
      } catch (err) {
        console.error("Error al verificar el pago:", err);
        if (!cancelado) setEstado("error");
      }
    };

    consultar();
    return () => {
      cancelado = true;
    };
  }, [sessionId]);

  return estado;
}
