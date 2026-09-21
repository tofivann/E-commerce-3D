import React from "react";
import { useTranslation } from "react-i18next";
import type { EstadoComision } from "../../api/comisiones.api";
import { TEMA_ESTADO, claveEtiquetaEstado } from "../../utils/estadoComision";

export interface ComisionCardProps {
  tipoLabel: string;
  estado: EstadoComision;
  titulo: string;
  subtitulo: string;
  foto: string | null;
  fotoIconoFallback: string;
  codigoOrden: string;
  total: number | string;
  fechaOrden: string;
  onClick?: () => void;
  // Botones/acciones específicas de cada vista (Descargar en la del
  // cliente; Subir entrega/Publicar/Cancelar en la del admin).
  footer?: React.ReactNode;
}

export const ComisionCard: React.FC<ComisionCardProps> = ({
  tipoLabel,
  estado,
  titulo,
  subtitulo,
  foto,
  fotoIconoFallback,
  codigoOrden,
  total,
  fechaOrden,
  onClick,
  footer,
}) => {
  const { t, i18n } = useTranslation();
  const tema = TEMA_ESTADO[estado];
  const etiquetaEstado = t(claveEtiquetaEstado(estado));

  return (
    <div
      onClick={onClick}
      className={`card-hover rounded-xl border overflow-hidden flex flex-col h-full transition-colors ${tema.cardBg} ${tema.cardBorder} ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div className="relative h-40 overflow-hidden bg-surface-container-lowest shrink-0">
        {foto ? (
          <img src={foto} alt={titulo} className="object-cover w-full h-full transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[40px] text-outline">{fotoIconoFallback}</span>
          </div>
        )}
        <span
          className={`absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${tema.badgeBg} ${tema.badgeText}`}
        >
          <span className="material-symbols-outlined text-[13px]">{tema.icon}</span>
          {etiquetaEstado}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-1">
        <span className="self-start text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant mb-1">
          {tipoLabel}
        </span>
        <h3 className="font-semibold text-on-surface truncate">{titulo}</h3>
        <p className="text-on-surface-variant text-xs font-mono truncate">{subtitulo}</p>
        <div className="flex items-center justify-between text-on-surface-variant text-xs font-mono mt-1">
          <span className="flex items-center gap-1 truncate">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            {new Date(fechaOrden).toLocaleDateString(i18n.language, { year: "numeric", month: "short", day: "numeric" })}
          </span>
          <span className="text-primary-fixed-dim font-bold shrink-0">${Number(total).toFixed(2)}</span>
        </div>
        <p className="text-on-surface-variant/70 text-[11px] font-mono">
          {t("comisiones.orderCode", { code: codigoOrden })}
        </p>

        {footer && <div className="mt-auto pt-3">{footer}</div>}
      </div>
    </div>
  );
};
