import React from "react";
import type { Item } from "./SolicitudesComisionesTable";

interface ComisionDetalleModalProps {
  item: Item | null;
  onClose: () => void;
}

const ESTADO_LABEL: Record<string, string> = {
  SOLICITADO: "En cola",
  EN_PROCESO: "En proceso",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};

const Campo: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant mb-0.5">
      {label}
    </p>
    <div className="text-on-surface text-sm">{children}</div>
  </div>
);

export const ComisionDetalleModal: React.FC<ComisionDetalleModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel relative w-full max-w-xl rounded-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto bg-surface-container-lowest/95">
        <button
          type="button"
          className="absolute top-6 right-6 text-on-surface-variant hover:text-primary transition-colors"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary-container/40 text-primary-fixed-dim">
            {item.tipo === "motion" ? "Motion" : "Modelo Nuevo"}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
            {ESTADO_LABEL[item.data.estado] || item.data.estado}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-6">
          {item.tipo === "motion" ? item.data.nombre_cancion : item.data.nombre_personaje}
        </h2>

        {/* Cliente */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-outline-variant/30">
          <Campo label="Cliente">{item.data.usuario_nombre || "—"}</Campo>
          <Campo label="Email">{item.data.usuario_email || "—"}</Campo>
        </div>

        {/* Orden */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-outline-variant/30">
          <Campo label="Orden">{item.data.orden.codigo_orden}</Campo>
          <Campo label="Pago">{item.data.orden.estado_pago}</Campo>
          <Campo label="Total">${Number(item.data.orden.total).toFixed(2)}</Campo>
          <Campo label="Fecha">
            {new Date(item.data.orden.fecha_orden).toLocaleString("es-ES", {
              year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </Campo>
        </div>

        {/* Detalles de la comisión */}
        {item.tipo === "motion" ? (
          <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-outline-variant/30">
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Tramo de personajes">
                {item.data.tramo_personajes.nombre} (${Number(item.data.tramo_personajes.precio).toFixed(2)})
              </Campo>
              <Campo label="Nombre del juego">{item.data.nombre_juego}</Campo>
            </div>
            <Campo label="Canción">{item.data.nombre_cancion}</Campo>
            <Campo label="Video de referencia">
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
              <Campo label="Información adicional">
                <p className="whitespace-pre-line">{item.data.informacion_adicional}</p>
              </Campo>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-outline-variant/30">
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Juego">
                {item.data.juego.nombre} (${Number(item.data.juego.precio).toFixed(2)})
              </Campo>
              <Campo label="Nombre del personaje">{item.data.nombre_personaje}</Campo>
            </div>
            <Campo label="Fotos de referencia">
              <div className="flex gap-3 mt-1">
                {[item.data.foto_referencia_1, item.data.foto_referencia_2].filter(Boolean).map((foto, i) => (
                  <a key={i} href={foto as string} target="_blank" rel="noreferrer">
                    <img
                      src={foto as string}
                      alt={`Referencia ${i + 1}`}
                      className="w-28 h-28 object-cover rounded-lg border border-outline-variant/30 hover:opacity-80 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </Campo>
            {item.data.producto_publicado && (
              <Campo label="Publicado en la tienda">
                <span className="text-primary-fixed-dim font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Producto #{item.data.producto_publicado}
                </span>
              </Campo>
            )}
          </div>
        )}

        {/* Entrega */}
        <Campo label="Archivo de entrega">
          {item.data.archivo_entrega ? (
            <a
              href={item.data.archivo_entrega}
              target="_blank"
              rel="noreferrer"
              className="text-primary-fixed-dim hover:underline no-underline inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Ver archivo subido
            </a>
          ) : (
            <span className="text-on-surface-variant">Todavía no se ha subido.</span>
          )}
        </Campo>
      </div>
    </div>
  );
};
