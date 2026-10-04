import React from "react";

// Filas de relleno de la carga inicial de una tabla. Un solo número para
// todas, así se ajusta aquí y cambia en Ajustes y en Estadísticas a la vez.
const FILAS_CARGA_INICIAL = 12;

interface TablaSkeletonProps {
  // Por defecto, las de la carga inicial; al pedir más páginas se pasan menos.
  filas?: number;
  columnas: number;
  // Mismo padding que las celdas reales de la tabla donde se usa.
  celdaClassName?: string;
}

// Filas de relleno animadas para una tabla que está cargando. Va DENTRO del
// <tbody> de la tabla real, así conserva sus columnas y su cabecera. Misma
// animación que ProductGridSkeleton.
export const TablaSkeleton: React.FC<TablaSkeletonProps> = ({
  filas = FILAS_CARGA_INICIAL,
  columnas,
  celdaClassName = "py-3 px-6",
}) => (
  <>
    {Array.from({ length: filas }, (_, fila) => (
      <tr key={fila} aria-hidden="true">
        {Array.from({ length: columnas }, (_, columna) => (
          <td key={columna} className={celdaClassName}>
            <div className="h-4 rounded bg-surface-container-highest animate-pulse" />
          </td>
        ))}
      </tr>
    ))}
  </>
);
