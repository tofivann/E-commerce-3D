import { useCallback, useEffect, useState } from "react";
import { ventasAdminApi } from "../api/ventas.api";
import type { FiltroVentas, ResumenVentas, Venta } from "../api/ventas.api";
import { instantesDeRango } from "../utils/fechas";
import type { RangoFechas } from "../utils/fechas";
import { useListaPaginada } from "./useListaPaginada";
import type { ListaPaginada } from "./useListaPaginada";

const idDeVenta = (venta: Venta) => venta.id;

// Ventas del filtro y rango elegidos, cargadas por páginas (scroll infinito).
export function useVentasPaginadas(filtro: FiltroVentas, rango: RangoFechas): ListaPaginada<Venta> {
  const clave = JSON.stringify({ filtro, ...instantesDeRango(rango) });
  const cargarPagina = useCallback(
    (page: number) => {
      const { filtro: f, ...instantes } = JSON.parse(clave) as { filtro: FiltroVentas; desde?: string; hasta?: string };
      return ventasAdminApi.listar(f, instantes, page);
    },
    [clave]
  );
  return useListaPaginada<Venta>({ clave, cargarPagina, obtenerId: idDeVenta });
}

// Total y cantidad de cada filtro para el rango elegido. `resumen` es null
// mientras carga el del rango actual (o si falló: entonces `error`).
export function useResumenVentas(rango: RangoFechas): { resumen: ResumenVentas | null; error: boolean } {
  const clave = JSON.stringify(instantesDeRango(rango));
  // Se guarda junto a la clave con la que se pidió: lo que haya de otro
  // rango se ignora en el render, sin un setState de "reinicio" en el efecto.
  const [estado, setEstado] = useState<{ clave: string; resumen: ResumenVentas | null } | null>(null);

  useEffect(() => {
    let vigente = true;
    ventasAdminApi
      .resumen(JSON.parse(clave))
      .then((resumen) => vigente && setEstado({ clave, resumen }))
      .catch((err) => {
        console.error("Error al cargar el resumen de ventas:", err);
        if (vigente) setEstado({ clave, resumen: null });
      });
    return () => {
      vigente = false;
    };
  }, [clave]);

  const alDia = estado?.clave === clave;
  return { resumen: alDia ? estado.resumen : null, error: alDia && estado.resumen === null };
}
