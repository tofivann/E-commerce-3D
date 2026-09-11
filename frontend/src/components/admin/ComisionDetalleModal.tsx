import React from "react";
import { useTranslation } from "react-i18next";
import { nombreCategoria } from "../../utils/categoria";
import { nombreTramoMotion } from "../../utils/tramoMotion";
import type { Item } from "./SolicitudesComisionesTable";

interface ComisionDetalleModalProps {
  item: Item | null;
  onClose: () => void;
}

const Campo: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant mb-0.5">
      {label}
    </p>
    <div className="text-on-surface text-sm">{children}</div>
  </div>
);

export const ComisionDetalleModal: React.FC<ComisionDetalleModalProps> = ({ item, onClose }) => {
  const { t, i18n } = useTranslation();
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel relative w-full max-w-xl rounded-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto bg-surface-container-lowest/95">
        <button
          type="button"
          className="absolute top-6 right-6 text-on-surface-variant hover:text-primary transition-colors"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary-container/40 text-primary-fixed-dim">
            {item.tipo === "motion" ? t("commissionsPage.motion") : t("commissionsPage.newModel")}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
            {t(`estado.${item.data.estado}`)}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-6">
          {item.tipo === "motion" ? item.data.nombre_cancion : item.data.nombre_personaje}
        </h2>

        {/* Cliente */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-outline-variant/30">
          <Campo label={t("comisionDetalle.client")}>{item.data.usuario_nombre || "—"}</Campo>
          <Campo label={t("comisionDetalle.email")}>{item.data.usuario_email || "—"}</Campo>
        </div>

        {/* Orden */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-outline-variant/30">
          <Campo label={t("comisionDetalle.order")}>{item.data.orden.codigo_orden}</Campo>
          <Campo label={t("comisionDetalle.payment")}>{item.data.orden.estado_pago}</Campo>
          <Campo label={t("comisionDetalle.total")}>${Number(item.data.orden.total).toFixed(2)}</Campo>
          <Campo label={t("comisionDetalle.date")}>
            {new Date(item.data.orden.fecha_orden).toLocaleString(i18n.language, {
              year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </Campo>
        </div>

        {/* Detalles de la comisión */}
        {item.tipo === "motion" ? (
          <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-outline-variant/30">
            <div className="grid grid-cols-2 gap-4">
              <Campo label={t("comisionDetalle.tramoLabel")}>
                {nombreTramoMotion(item.data.tramo_personajes)} (${Number(item.data.tramo_personajes.precio).toFixed(2)})
              </Campo>
              <Campo label={t("comisionDetalle.gameNameLabel")}>{item.data.nombre_juego}</Campo>
            </div>
            <Campo label={t("comisionDetalle.song")}>{item.data.nombre_cancion}</Campo>
            <Campo label={t("comisionDetalle.referenceVideo")}>
              <a
                href={item.data.link_video}
                target="_blank"
                rel="noreferrer"
                className="text-primary-fixed-dim hover:underline no-underline inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">play_circle</span>
                {item.data.link_video}
              </a>
            </Campo>
            {item.data.informacion_adicional && (
              <Campo label={t("motionForm.additionalInfo")}>
                <p className="whitespace-pre-line">{item.data.informacion_adicional}</p>
              </Campo>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-outline-variant/30">
            <div className="grid grid-cols-2 gap-4">
              <Campo label={t("comisionDetalle.game")}>
                {item.data.juego.nombre} (${Number(item.data.juego.precio).toFixed(2)})
              </Campo>
              <Campo label={t("comisionDetalle.characterNameLabel")}>{item.data.nombre_personaje}</Campo>
            </div>
            <Campo label={t("comisionDetalle.referencePhotos")}>
              <div className="flex gap-3 mt-1">
                {[item.data.foto_referencia_1, item.data.foto_referencia_2].filter(Boolean).map((foto, i) => (
                  <a key={i} href={foto as string} target="_blank" rel="noreferrer">
                    <img
                      src={foto as string}
                      alt={t("comisionDetalle.referenceAlt", { n: i + 1 })}
                      className="w-28 h-28 object-cover rounded-lg border border-outline-variant/30 hover:opacity-80 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </Campo>
          </div>
        )}

        {/* Entrega */}
        <div className="flex flex-wrap items-start gap-6">
          <Campo label={t("comisionDetalle.deliveryFile")}>
            {item.data.archivo_entrega ? (
              <a
                href={item.data.archivo_entrega}
                target="_blank"
                rel="noreferrer"
                className="text-primary-fixed-dim hover:underline no-underline inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                {t("comisionDetalle.viewUploadedFile")}
              </a>
            ) : (
              <span className="text-on-surface-variant">{t("comisionDetalle.notUploadedYet")}</span>
            )}
          </Campo>
          {item.data.foto_entrega && (
            <Campo label={t("comisionDetalle.deliveryPhoto")}>
              <a href={item.data.foto_entrega} target="_blank" rel="noreferrer">
                <img
                  src={item.data.foto_entrega}
                  alt={t("comisionDetalle.deliveryPhoto")}
                  className="w-20 h-20 object-cover rounded-lg border border-outline-variant/30 hover:opacity-80 transition-opacity mt-1"
                />
              </a>
            </Campo>
          )}
          {item.data.categoria && (
            <Campo label={t("comisionDetalle.categoryLabel")}>{nombreCategoria(item.data.categoria, i18n.language)}</Campo>
          )}
          {item.data.producto_publicado && (
            <Campo label={t("comisionDetalle.publishedInShop")}>
              <span className="text-primary-fixed-dim font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                {t("comisionDetalle.productNumber", { id: item.data.producto_publicado })}
              </span>
            </Campo>
          )}
        </div>
      </div>
    </div>
  );
};
