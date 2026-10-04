import React from "react";

interface KpiProps {
  etiqueta: string;
  // La cifra, ya formateada ("$1,057.00", "42"...).
  valor: string;
  nota?: string;
  // Mientras la cifra carga: en su lugar se dibuja un relleno animado.
  cargando?: boolean;
  // Si se pasa onClick, el KPI es un botón que se puede elegir (p. ej. como
  // filtro) y `activa` lo marca; sin onClick es una tarjeta solo informativa.
  onClick?: () => void;
  activa?: boolean;
}

// Tarjeta de indicador (KPI): etiqueta, cifra destacada y una nota opcional.
// Es el único sitio donde se define su aspecto; cualquier sección que
// muestre indicadores debe usar este componente. Hoy lo usa "Estadísticas y
// pagos" a través de FiltroChips, donde cada KPI es además un filtro.
export const Kpi: React.FC<KpiProps> = ({ etiqueta, valor, nota, cargando = false, onClick, activa = false }) => {
  const contenido = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{etiqueta}</p>
      {cargando ? (
        // Mismas alturas que la cifra y la nota, para que la tarjeta no salte al cargar.
        <div aria-hidden="true">
          <div className="h-6 w-24 max-w-full rounded bg-surface-container-highest animate-pulse mt-2" />
          <div className="h-3 w-16 rounded bg-surface-container-highest animate-pulse mt-2" />
        </div>
      ) : (
        <>
          <p className="text-xl font-bold font-mono text-on-surface mt-1 truncate">{valor}</p>
          {nota && <p className="text-xs text-on-surface-variant mt-0.5">{nota}</p>}
        </>
      )}
    </>
  );
  const base = "rounded-xl border p-4 text-left";

  if (!onClick) {
    return <div className={`${base} border-outline-variant/50`}>{contenido}</div>;
  }
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={`${base} transition-all cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-primary ${
        activa
          ? "border-primary bg-primary-container/15 ring-1 ring-primary"
          : "border-outline-variant/50 hover:border-primary/50 hover:bg-surface-variant/20"
      }`}
    >
      {contenido}
    </button>
  );
};
