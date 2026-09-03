import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ComisionMotion, ComisionModelo } from "../../api/comisiones.api";
import { comisionesApi, descargarComisionMotion, descargarComisionModelo } from "../../api/comisiones.api";

type Item =
  | { tipo: "motion"; data: ComisionMotion }
  | { tipo: "modelo"; data: ComisionModelo };

export const ComisionesLibrary: React.FC = () => {
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
      setError("No se pudieron cargar tus comisiones.");
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
      window.alert("No se pudo descargar el archivo. Inténtalo de nuevo.");
    } finally {
      setDescargandoId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-56 rounded-lg bg-surface-container-low animate-pulse border border-outline-variant/20" />
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
        <p className="text-on-surface-variant">Aún no tienes comisiones completadas.</p>
        <Link to="/comisiones" className="text-primary-fixed-dim font-semibold hover:underline no-underline">
          Solicitar una comisión →
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

        return (
          <div
            key={key}
            className="card-hover bg-surface-container-low rounded-lg border border-outline-variant/30 overflow-hidden flex flex-col h-full"
          >
            <div className="p-4 flex flex-col flex-1 gap-1">
              <span className="self-start text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary-container/40 text-primary-fixed-dim mb-1">
                {item.tipo === "motion" ? "Motion" : "Modelo Nuevo"}
              </span>
              <h3 className="font-semibold text-on-surface truncate">{titulo}</h3>
              <p className="text-on-surface-variant text-xs font-mono">{subtitulo}</p>
              <p className="text-on-surface-variant text-xs font-mono">
                Código: {item.data.orden.codigo_orden}
              </p>

              <div className="mt-auto pt-3">
                <button
                  onClick={() => handleDescargar(item)}
                  disabled={descargandoId === key}
                  className="w-full py-2 px-4 rounded bg-primary-container text-on-primary-fixed btn-glow-inner font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  {descargandoId === key ? "Descargando..." : "Descargar"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
