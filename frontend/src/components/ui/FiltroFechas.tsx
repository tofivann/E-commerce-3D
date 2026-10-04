import React from "react";
import { useTranslation } from "react-i18next";
import { ATAJOS_FECHAS, atajoDeRango, rangoDeAtajo } from "../../utils/fechas";
import type { AtajoFechas, RangoFechas } from "../../utils/fechas";
import { FiltroChips } from "./FiltroChips";

interface FiltroFechasProps {
  rango: RangoFechas;
  onChange: (rango: RangoFechas) => void;
}

const inputClass =
  "bg-surface-variant border border-outline-variant rounded-lg py-1.5 px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary";

// Rango de fechas "desde / hasta" con atajos (todo, este mes, mes pasado,
// este año). Solo maneja la selección; quien lo usa decide qué filtrar.
export const FiltroFechas: React.FC<FiltroFechasProps> = ({ rango, onChange }) => {
  const { t } = useTranslation();
  // Si el rango escrito a mano no coincide con ningún atajo, ninguno queda
  // marcado ("personalizado" no es una opción: es simplemente no elegir).
  const atajoActivo = atajoDeRango(rango) ?? ("" as AtajoFechas | "");

  return (
    <div className="flex flex-col gap-3">
      <FiltroChips<AtajoFechas | "">
        titulo={t("filtroFechas.title")}
        opciones={ATAJOS_FECHAS.map((atajo) => ({ valor: atajo, etiqueta: t(`filtroFechas.${atajo}`) }))}
        seleccionado={atajoActivo}
        onChange={(atajo) => atajo && onChange(rangoDeAtajo(atajo))}
      />
      <div className="flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
        <label className="flex items-center gap-2">
          {t("filtroFechas.from")}
          <input
            id="filtroFechasDesde"
            type="date"
            className={inputClass}
            value={rango.desde}
            max={rango.hasta || undefined}
            onChange={(e) => onChange({ ...rango, desde: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2">
          {t("filtroFechas.to")}
          <input
            id="filtroFechasHasta"
            type="date"
            className={inputClass}
            value={rango.hasta}
            min={rango.desde || undefined}
            onChange={(e) => onChange({ ...rango, hasta: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
};
