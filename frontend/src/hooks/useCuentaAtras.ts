import { useCallback, useEffect, useState } from "react";

// Cuenta atrás en segundos (p. ej. la espera para reenviar un código).
// `iniciar(segundos)` la arranca o la reinicia; `restante` llega a 0 y ahí
// se queda. Se calcula contra el reloj, no restando de uno en uno, así no se
// atrasa si el navegador frena los temporizadores de una pestaña en segundo plano.
export function useCuentaAtras() {
  const [fin, setFin] = useState(0);
  const [ahora, setAhora] = useState(0);

  useEffect(() => {
    if (fin === 0) return;
    const id = window.setInterval(() => {
      const actual = Date.now();
      setAhora(actual);
      if (actual >= fin) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [fin]);

  const iniciar = useCallback((segundos: number) => {
    const actual = Date.now();
    setAhora(actual);
    setFin(actual + segundos * 1000);
  }, []);

  return { restante: Math.max(0, Math.ceil((fin - ahora) / 1000)), iniciar };
}
