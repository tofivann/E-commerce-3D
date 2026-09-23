import React from "react";
import { useTranslation } from "react-i18next";
import type { EstadoComision } from "../../api/comisiones.api";
import { TEMA_ESTADO, claveEtiquetaEstado } from "../../utils/estadoComision";

export interface ComisionCardClienteProps {
  tipoLabel: string;
  estado: EstadoComision;
  titulo: string;
  subtitulo: string;
  foto: string | null;
  fotoIconoFallback: string;
  total: number | string;
  // Va en la misma fila que el precio, a la derecha — un botón de ícono
  // (Descargar si está completada) o un texto corto de estado si no. Debe
  // ser compacto: no hay espacio de sobra en h-80.
  footer: React.ReactNode;
}

// Versión compacta de ComisionCard específica para las 2 vistas del
// cliente (MisComisionesList, ComisionesLibrary) — mismas proporciones que
// el catálogo de productos del admin (ProductAdminGrid: h-[320px] total,
// imagen h-48) en vez de la altura variable de ComisionCard, que crecía
// mucho por tener más campos (fecha, código de orden) pensados para el
// panel de admin. El panel de admin sigue usando ComisionCard tal cual.
export const ComisionCardCliente: React.FC<ComisionCardClienteProps> = ({
  tipoLabel,
  estado,
  titulo,
  subtitulo,
  foto,
  fotoIconoFallback,
  total,
  footer,
}) => {
  const { t } = useTranslation();
  const tema = TEMA_ESTADO[estado];
  const etiquetaEstado = t(claveEtiquetaEstado(estado));

  return (
    <div
      className={`card-hover rounded-xl border overflow-hidden relative flex flex-col h-80 transition-all hover:-translate-y-1 ${tema.cardBg} ${tema.cardBorder}`}
    >
      <div className="h-48 w-full overflow-hidden bg-surface-container-lowest relative shrink-0">
        {foto ? (
          <img
            src={foto}
            alt={titulo}
            className="w-full h-full object-cover object-top transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[40px] text-outline">{fotoIconoFallback}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface-container-high/60 to-transparent z-10" />
        <span
          className={`absolute top-2 right-2 z-20 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${tema.badgeBg} ${tema.badgeText}`}
        >
          <span className="material-symbols-outlined text-[13px]">{tema.icon}</span>
          {etiquetaEstado}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1 relative z-20 -mt-8 bg-surface/20 backdrop-blur-lg border border-outline-variant/30 rounded-t-xl mx-2 mb-2">
        <span className="self-start text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant mb-1">
          {tipoLabel}
        </span>
        <h3 className="font-semibold text-on-surface leading-tight truncate">{titulo}</h3>
        <p className="text-on-surface-variant text-xs font-mono truncate">{subtitulo}</p>

        {/* Precio y acción en la MISMA fila (como el precio+botón editar de
            ProductAdminGrid) — apilados como antes no cabían en h-80. */}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <span className="text-primary-fixed-dim font-bold font-mono text-sm shrink-0">
            ${Number(total).toFixed(2)}
          </span>
          {footer}
        </div>
      </div>
    </div>
  );
};
