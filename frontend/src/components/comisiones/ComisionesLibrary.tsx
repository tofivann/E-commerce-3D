import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ComisionMotion, ComisionModelo } from "../../api/comisiones.api";
import { comisionesApi, descargarComisionMotion, descargarComisionModelo } from "../../api/comisiones.api";
import { ComisionCardCliente } from "./ComisionCardCliente";

type Item =
  | { tipo: "motion"; data: ComisionMotion }
  | { tipo: "modelo"; data: ComisionModelo };

export const ComisionesLibrary: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descargandoId, setDescargandoId] = useState<string | null>(null);

  useEffect(() => {
    fetchComisiones();
  }, []);

  const fetchComisiones = async () => {
    try {
      setLoading(true);
      setError(null);
      const [motion, modelo] = await Promise.all([
        comisionesApi.misComisionesMotion(),
        comisionesApi.misComisionesModelo(),
      ]);
      const completadas: Item[] = [
        ...motion.filter((c) => c.estado === "COMPLETADO").map((data): Item => ({ tipo: "motion", data })),
        ...modelo.filter((c) => c.estado === "COMPLETADO").map((data): Item => ({ tipo: "modelo", data })),
      ];
      setItems(completadas);
    } catch (err) {
      console.error("Error al cargar las comisiones completadas:", err);
      setError(t("comisionesLibrary.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleDescargar = async (item: Item) => {
    const key = `${item.tipo}-${item.data.id}`;
    setDescargandoId(key);
    try {
      if (item.tipo === "motion") await descargarComisionMotion(item.data);
      else await descargarComisionModelo(item.data);
    } catch (err) {
      console.error("Error al descargar el archivo:", err);
      window.alert(t("misComisiones.downloadError"));
    } finally {
      setDescargandoId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-80 rounded-lg bg-surface-container-low animate-pulse border border-outline-variant/20" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-error/20 border border-error/50 rounded-md text-on-error-container text-center">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-12 flex flex-col items-center gap-3 text-center">
        <span className="material-symbols-outlined text-[48px] text-outline">design_services</span>
        <p className="text-on-surface-variant">{t("comisionesLibrary.empty")}</p>
        <Link to="/comisiones" className="text-primary-fixed-dim font-semibold hover:underline no-underline">
          {t("comisionesLibrary.requestCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => {
        const key = `${item.tipo}-${item.data.id}`;
        const titulo = item.tipo === "motion" ? item.data.nombre_cancion : item.data.nombre_personaje;
        const subtitulo = item.tipo === "motion" ? item.data.nombre_juego : item.data.juego.nombre;

        const foto = item.data.foto_entrega;

        return (
          <ComisionCardCliente
            key={key}
            tipoLabel={item.tipo === "motion" ? t("commissionsPage.motion") : t("commissionsPage.newModel")}
            estado={item.data.estado}
            titulo={titulo}
            subtitulo={subtitulo}
            foto={foto}
            fotoIconoFallback={item.tipo === "motion" ? "music_note" : "view_in_ar"}
            codigoOrden={item.data.orden.codigo_orden}
            total={item.data.orden.total}
            footer={
              <button
                onClick={() => handleDescargar(item)}
                disabled={descargandoId === key}
                title={descargandoId === key ? t("misComisiones.downloading") : t("misComisiones.download")}
                aria-label={descargandoId === key ? t("misComisiones.downloading") : t("misComisiones.download")}
                className="shrink-0 w-9 h-9 rounded-full bg-primary-container text-on-primary-fixed btn-glow-inner flex items-center justify-center hover:bg-primary-fixed-dim transition-all active:scale-95 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[18px] ${descargandoId === key ? "animate-pulse" : ""}`}>
                  download
                </span>
              </button>
            }
          />
        );
      })}
    </div>
  );
};
