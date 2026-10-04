import React from "react";

interface TablaSkeletonProps {
  filas: number;
  columnas: number;
  // Mismo padding que las celdas reales de la tabla donde se usa.
  celdaClassName?: string;
}

// Filas de relleno animadas para una tabla que está cargando. Va DENTRO del
// <tbody> de la tabla real, así conserva sus columnas y su cabecera. Misma
// animación que ProductGridSkeleton.
export const TablaSkeleton: React.FC<TablaSkeletonProps> = ({ filas, columnas, celdaClassName = "py-3 px-6" }) => (
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
