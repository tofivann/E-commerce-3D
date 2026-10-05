import { useEffect, useState } from "react";
import { userApi } from "../services/userApi";
import type { PrecioSuscripcion } from "../services/userApi";

// El precio no cambia mientras la página está abierta: se pide una sola vez
// y lo comparten todos los que lo muestren. Si la petición falla se olvida,
// para que el siguiente que lo necesite lo vuelva a intentar.
let peticion: Promise<PrecioSuscripcion> | null = null;

function pedirPrecio(): Promise<PrecioSuscripcion> {
  peticion ??= userApi.precioSuscripcion().catch((err) => {
    peticion = null;
    throw err;
  });
  return peticion;
}

// Lo que cuesta activar una cuenta, tal como lo define el servidor (nunca un
// número escrito en el frontend). `null` mientras carga o si no se pudo leer.
export function usePrecioSuscripcion(): PrecioSuscripcion | null {
  const [precio, setPrecio] = useState<PrecioSuscripcion | null>(null);

  useEffect(() => {
    let vigente = true;
    pedirPrecio()
      .then((dato) => {
        if (vigente) setPrecio(dato);
      })
      .catch((err) => console.error("No se pudo leer el precio de la suscripción:", err));
    return () => {
      vigente = false;
    };
  }, []);

  return precio;
}
