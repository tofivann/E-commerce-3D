import { Kpi } from "./Kpi";
import { Pildora } from "./Pildora";

export interface OpcionFiltro<T extends string> {
  valor: T;
  etiqueta: string;
  // Opcionales: un dato destacado (p. ej. un total) y una nota debajo. Si
  // alguna opción los trae, todas se dibujan como KPI en vez de píldora.
  destacado?: string;
  nota?: string;
}

interface FiltroChipsProps<T extends string> {
  opciones: OpcionFiltro<T>[];
  seleccionado: T;
  onChange: (valor: T) => void;
  // Texto pequeño a la izquierda de la fila ("Estado", "Categorías"...).
  titulo?: string;
}

// Fila de opciones donde se elige exactamente una. Genérico: no sabe de
// comisiones ni de ventas. Lo usan el filtro por estado de las comisiones
// del admin (pastillas) y los filtros de "Estadísticas y pagos" (tarjetas
// con el total de cada uno).
export function FiltroChips<T extends string>({ opciones, seleccionado, onChange, titulo }: FiltroChipsProps<T>) {
  const comoTarjetas = opciones.some((opcion) => opcion.destacado !== undefined);

  if (comoTarjetas) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3" role="group" aria-label={titulo}>
        {opciones.map((opcion) => (
          <Kpi
            key={opcion.valor}
            etiqueta={opcion.etiqueta}
            valor={opcion.destacado ?? "—"}
            nota={opcion.nota}
            activa={opcion.valor === seleccionado}
            onClick={() => onChange(opcion.valor)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={titulo}>
      {titulo && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant mr-1">{titulo}</span>
      )}
      {opciones.map((opcion) => (
        <Pildora key={opcion.valor} activa={opcion.valor === seleccionado} onClick={() => onChange(opcion.valor)}>
          {opcion.etiqueta}
        </Pildora>
      ))}
    </div>
  );
}
