import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ComisionMotion, ComisionModelo } from "../../api/comisiones.api";
import { comisionesApi, descargarComisionMotion, descargarComisionModelo } from "../../api/comisiones.api";
import { nombreTramoMotion } from "../../utils/tramoMotion";
import { ComisionCard } from "./ComisionCard";

type Item =
  | { tipo: "motion"; data: ComisionMotion }
  | { tipo: "modelo"; data: ComisionModelo };

export interface MisComisionesListProps {
  refreshKey?: number;
}

export const MisComisionesList: React.FC<MisComisionesListProps> = ({ refreshKey = 0 }) => {
  const { t } = useTranslation();
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
      window.alert(t("misComisiones.downloadError"));
    } finally {
      setDescargandoId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-72 rounded-xl bg-surface-container-low animate-pulse border border-outline-variant/20" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-10 flex flex-col items-center gap-2 text-center">
        <span className="material-symbols-outlined text-[40px] text-outline">design_services</span>
        <p className="text-on-surface-variant">{t("misComisiones.empty")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => {
        const key = `${item.tipo}-${item.data.id}`;
        const titulo = item.tipo === "motion" ? item.data.nombre_cancion : item.data.nombre_personaje;
        const subtitulo =
          item.tipo === "motion"
            ? t("misComisiones.motionSubtitle", {
                tramo: nombreTramoMotion(item.data.tramo_personajes),
                juego: item.data.nombre_juego,
              })
            : t("misComisiones.modeloSubtitle", { juego: item.data.juego.nombre });
        const foto = item.tipo === "motion" ? item.data.foto_entrega : item.data.foto_entrega || item.data.foto_referencia_1;
        const puedeDescargar = item.data.estado === "COMPLETADO" && Boolean(item.data.descarga_url);

        return (
          <ComisionCard
            key={key}
            tipoLabel={item.tipo === "motion" ? t("commissionsPage.motion") : t("commissionsPage.newModel")}
            estado={item.data.estado}
            titulo={titulo}
            subtitulo={subtitulo}
            foto={foto}
            fotoIconoFallback={item.tipo === "motion" ? "music_note" : "view_in_ar"}
            codigoOrden={item.data.orden.codigo_orden}
            total={item.data.orden.total}
            fechaOrden={item.data.orden.fecha_orden}
            footer={
              puedeDescargar ? (
                <button
                  onClick={() => handleDescargar(item)}
                  disabled={descargandoId === key}
                  className="w-full py-2 px-4 rounded-lg bg-primary-container text-on-primary-fixed btn-glow-inner font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  {descargandoId === key ? t("misComisiones.downloading") : t("misComisiones.download")}
                </button>
              ) : (
                <p className="text-on-surface-variant text-xs italic text-center">
                  {item.data.estado === "SOLICITADO"
                    ? t("misComisiones.confirmingPayment")
                    : item.data.estado === "CANCELADO"
                    ? t("misComisiones.cancelled")
                    : t("misComisiones.working")}
                </p>
              )
            }
          />
        );
      })}
    </div>
  );
};
