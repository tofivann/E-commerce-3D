import React, { useEffect, useState } from "react";
import type {
  ComisionMotionAdmin,
  ComisionModeloAdmin,
  EstadoComision,
} from "../../api/comisiones.api";
import { comisionesAdminApi } from "../../api/comisiones.api";
import { PublicarProductoModal } from "./PublicarProductoModal";
import { ComisionDetalleModal } from "./ComisionDetalleModal";

export type Item =
  | { tipo: "motion"; data: ComisionMotionAdmin }
  | { tipo: "modelo"; data: ComisionModeloAdmin };

const ESTADOS: EstadoComision[] = ["SOLICITADO", "EN_PROCESO", "COMPLETADO", "CANCELADO"];

export const SolicitudesComisionesTable: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [publicando, setPublicando] = useState<ComisionModeloAdmin | null>(null);
  const [viendo, setViendo] = useState<Item | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const [motion, modelo] = await Promise.all([
        comisionesAdminApi.listarSolicitudesMotion(),
        comisionesAdminApi.listarSolicitudesModelo(),
      ]);
      const combinados: Item[] = [
        ...motion.map((data): Item => ({ tipo: "motion", data })),
        ...modelo.map((data): Item => ({ tipo: "modelo", data })),
      ].sort(
        (a, b) => new Date(b.data.orden.fecha_orden).getTime() - new Date(a.data.orden.fecha_orden).getTime(),
      );
      setItems(combinados);
    } catch (err) {
      console.error("Error al cargar solicitudes de comisiones:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleEstado = async (item: Item, estado: EstadoComision) => {
    const key = `${item.tipo}-${item.data.id}`;
    setGuardandoId(key);
    try {
      const formData = new FormData();
      formData.append("estado", estado);
      if (item.tipo === "motion") await comisionesAdminApi.actualizarSolicitudMotion(item.data.id, formData);
      else await comisionesAdminApi.actualizarSolicitudModelo(item.data.id, formData);
      cargar();
    } catch (err) {
      console.error("Error al actualizar el estado:", err);
      window.alert("No se pudo actualizar el estado.");
    } finally {
      setGuardandoId(null);
    }
  };

  const handleArchivo = async (item: Item, file: File) => {
    const key = `${item.tipo}-${item.data.id}`;
    setGuardandoId(key);
    try {
      const formData = new FormData();
      formData.append("archivo_entrega", file);
      if (item.tipo === "motion") await comisionesAdminApi.actualizarSolicitudMotion(item.data.id, formData);
      else await comisionesAdminApi.actualizarSolicitudModelo(item.data.id, formData);
      cargar();
    } catch (err) {
      console.error("Error al subir el archivo:", err);
      window.alert("No se pudo subir el archivo de entrega.");
    } finally {
      setGuardandoId(null);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-on-surface-variant">Cargando solicitudes...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-10 text-center text-on-surface-variant">
        No hay solicitudes de comisiones todavía.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const key = `${item.tipo}-${item.data.id}`;
        const titulo = item.tipo === "motion" ? item.data.nombre_cancion : item.data.nombre_personaje;
        const subtitulo =
          item.tipo === "motion"
            ? `${item.data.tramo_personajes.nombre} · ${item.data.nombre_juego}`
            : item.data.juego.nombre;
        const puedePublicar =
          item.tipo === "modelo" && item.data.archivo_entrega && !item.data.producto_publicado;

        return (
          <div
            key={key}
            onClick={() => setViendo(item)}
            className="glass-panel rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer hover:border-primary/40 border border-transparent transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary-container/40 text-primary-fixed-dim">
                  {item.tipo === "motion" ? "Motion" : "Modelo Nuevo"}
                </span>
                <h3 className="font-semibold text-on-surface">{titulo}</h3>
              </div>
              <p className="text-on-surface-variant text-xs font-mono mt-1">
                {item.data.usuario_nombre || "—"} · {subtitulo} · ${Number(item.data.orden.total).toFixed(2)}
              </p>
              <p className="text-on-surface-variant text-xs font-mono">
                Orden: {item.data.orden.codigo_orden} · Pago: {item.data.orden.estado_pago}
              </p>
              {item.tipo === "motion" && (
                <a
                  href={item.data.link_video}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary-fixed-dim text-xs hover:underline inline-flex items-center gap-1 mt-1"
                >
                  <span className="material-symbols-outlined text-[14px]">play_circle</span>
                  Ver referencia
                </a>
              )}
            </div>

            <div
              className="flex flex-wrap items-center gap-2 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <select
                value={item.data.estado}
                disabled={guardandoId === key}
                onChange={(e) => handleEstado(item, e.target.value as EstadoComision)}
                className="bg-surface-variant border border-outline-variant rounded-md py-1.5 px-2 text-sm text-on-surface outline-none focus:border-primary"
              >
                {ESTADOS.map((estado) => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>

              <label className="text-xs bg-surface-container-low border border-outline-variant/50 px-3 py-1.5 rounded-md font-semibold cursor-pointer hover:border-primary/50 transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                {item.data.archivo_entrega ? "Reemplazar archivo" : "Subir entrega"}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleArchivo(item, file);
                  }}
                />
              </label>

              {puedePublicar && (
                <button
                  onClick={() => setPublicando(item.data as ComisionModeloAdmin)}
                  className="text-xs bg-primary-container text-on-primary-fixed px-3 py-1.5 rounded-md font-semibold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">storefront</span>
                  Publicar a la tienda
                </button>
              )}
              {item.tipo === "modelo" && item.data.producto_publicado && (
                <span className="text-xs text-primary-fixed-dim font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Publicado
                </span>
              )}
            </div>
          </div>
        );
      })}

      <PublicarProductoModal
        comision={publicando}
        onClose={() => setPublicando(null)}
        onPublicado={() => {
          setPublicando(null);
          cargar();
        }}
      />

      <ComisionDetalleModal item={viendo} onClose={() => setViendo(null)} />
    </div>
  );
};
