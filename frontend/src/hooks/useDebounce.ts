import { useEffect, useState } from "react";

// Devuelve `valor` solo después de que deje de cambiar durante `retrasoMs`.
// Para inputs que disparan peticiones (búsqueda): una petición por pausa de
// escritura en vez de una por tecla.
export function useDebounce<T>(valor: T, retrasoMs = 300): T {
  const [valorRetrasado, setValorRetrasado] = useState(valor);

  useEffect(() => {
    const timer = setTimeout(() => setValorRetrasado(valor), retrasoMs);
    return () => clearTimeout(timer);
  }, [valor, retrasoMs]);

  return valorRetrasado;
}
