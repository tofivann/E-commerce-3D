import React, { useEffect, useState } from "react";
import type { ComisionMotion, ComisionModelo, EstadoComision } from "../../api/comisiones.api";
import { comisionesApi, descargarComisionMotion, descargarComisionModelo } from "../../api/comisiones.api";

type Item =
  | { tipo: "motion"; data: ComisionMotion }
  | { tipo: "modelo"; data: ComisionModelo };

const ESTADO_LABEL: Record<EstadoComision, string> = {
  SOLICITADO: "En cola",
  EN_PROCESO: "En proceso",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};

const ESTADO_CLASS: Record<EstadoComision, string> = {
  SOLICITADO: "bg-surface-container-high text-on-surface-variant",
  EN_PROCESO: "bg-tertiary-container/40 text-on-tertiary-container",
  COMPLETADO: "bg-primary-container/40 text-primary-fixed-dim",
  CANCELADO: "bg-error/20 text-on-error-container",
};

export interface MisComisionesListProps {
  refreshKey?: number;
}

export const MisComisionesList: React.FC<MisComisionesListProps> = ({ refreshKey = 0 }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [descargandoId, setDescargandoId] = useState<string | null>(null);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const [motion, modelo] = await Promise.all([
          comisionesApi.misComisionesMotion(),
          comisionesApi.misComisionesModelo(),
        ]);
        const combinados: Item[] = [
          ...motion.map((data): Item => ({ tipo: "motion", data })),
          ...modelo.map((data): Item => ({ tipo: "modelo", data })),
        ].sort(
          (a, b) => new Date(b.data.orden.fecha_orden).getTime() - new Date(a.data.orden.fecha_orden).getTime(),
        );
        setItems(combinados);
      } catch (err) {
        console.error("Error al cargar mis comisiones:", err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [refreshKey]);

  const handleDescargar = async (item: Item) => {
    const key = `${item.tipo}-${item.data.id}`;
    setDescargandoId(key);
    try {
      if (item.tipo === "motion") await descargarComisionMotion(item.data);
      else await descargarComisionModelo(item.data);
    } catch (err) {
      console.error("Error al descargar:", err);
      window.alert("No se pudo descargar el archivo. Inténtalo de nuevo.");
    } finally {
      setDescargandoId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2].map((n) => (
          <div key={n} className="h-24 rounded-lg bg-surface-container-low animate-pulse border border-outline-variant/20" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-10 flex flex-col items-center gap-2 text-center">
        <span className="material-symbols-outlined text-[40px] text-outline">design_services</span>
        <p className="text-on-surface-variant">Todavía no has pedido ninguna comisión.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const key = `${item.tipo}-${item.data.id}`;
        const titulo =
          item.tipo === "motion" ? item.data.nombre_cancion : item.data.nombre_personaje;
        const subtitulo =
          item.tipo === "motion"
            ? `Motion · ${item.data.tramo_personajes.nombre} · ${item.data.nombre_juego}`
            : `Modelo Nuevo · ${item.data.juego.nombre}`;

        return (
          <div
            key={key}
            className="bg-surface-container-low rounded-lg border border-outline-variant/30 p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-on-surface truncate">{titulo}</h3>
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${ESTADO_CLASS[item.data.estado]}`}>
                  {ESTADO_LABEL[item.data.estado]}
                </span>
              </div>
              <p className="text-on-surface-variant text-xs font-mono mt-1">{subtitulo}</p>
              <p className="text-primary-fixed-dim font-bold font-mono text-sm mt-1">
                ${Number(item.data.orden.total).toFixed(2)}
              </p>
            </div>

            {item.data.estado === "COMPLETADO" && item.data.descarga_url ? (
              <button
                onClick={() => handleDescargar(item)}
                disabled={descargandoId === key}
                className="shrink-0 py-2 px-4 rounded bg-primary-container text-on-primary-fixed font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                {descargandoId === key ? "Descargando..." : "Descargar"}
              </button>
            ) : (
              <span className="shrink-0 text-on-surface-variant text-xs italic">
                {item.data.orden.estado_pago !== "COMPLETADO" ? "Confirmando pago..." : "Trabajando en tu comisión..."}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
