// Rango de fechas "de calendario" tal como lo elige una persona: dos días
// en formato YYYY-MM-DD (el de <input type="date">), ambos incluidos. Cadena
// vacía = sin límite por ese lado.
export interface RangoFechas {
  desde: string;
  hasta: string;
}

export const RANGO_SIN_LIMITE: RangoFechas = { desde: "", hasta: "" };

export type AtajoFechas = "todo" | "esteMes" | "mesPasado" | "esteAnio";

export const ATAJOS_FECHAS: AtajoFechas[] = ["todo", "esteMes", "mesPasado", "esteAnio"];

function aTextoLocal(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// "2026-10-04" → medianoche de ese día en la zona horaria del navegador.
// (new Date("2026-10-04") lo interpretaría como UTC y correría el día.)
function aFechaLocal(texto: string): Date {
  const [anio, mes, dia] = texto.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

export function rangoDeAtajo(atajo: AtajoFechas, hoy: Date = new Date()): RangoFechas {
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  switch (atajo) {
    case "todo":
      return RANGO_SIN_LIMITE;
    case "esteMes":
      // Día 0 del mes siguiente = último día de este mes.
      return { desde: aTextoLocal(new Date(anio, mes, 1)), hasta: aTextoLocal(new Date(anio, mes + 1, 0)) };
    case "mesPasado":
      return { desde: aTextoLocal(new Date(anio, mes - 1, 1)), hasta: aTextoLocal(new Date(anio, mes, 0)) };
    case "esteAnio":
      return { desde: aTextoLocal(new Date(anio, 0, 1)), hasta: aTextoLocal(new Date(anio, 11, 31)) };
  }
}

export function atajoDeRango(rango: RangoFechas, hoy: Date = new Date()): AtajoFechas | null {
  return (
    ATAJOS_FECHAS.find((atajo) => {
      const candidato = rangoDeAtajo(atajo, hoy);
      return candidato.desde === rango.desde && candidato.hasta === rango.hasta;
    }) ?? null
  );
}

// Lo que se manda al backend: instantes ISO en UTC para el intervalo
// [desde, hasta) — inicio del primer día e inicio del día SIGUIENTE al
// último, ambos en la zona horaria del navegador. Así "octubre" es el
// octubre de quien mira, no el del servidor (que trabaja en UTC).
export function instantesDeRango(rango: RangoFechas): { desde?: string; hasta?: string } {
  const instantes: { desde?: string; hasta?: string } = {};
  if (rango.desde) instantes.desde = aFechaLocal(rango.desde).toISOString();
  if (rango.hasta) {
    const diaSiguiente = aFechaLocal(rango.hasta);
    diaSiguiente.setDate(diaSiguiente.getDate() + 1);
    instantes.hasta = diaSiguiente.toISOString();
  }
  return instantes;
}
