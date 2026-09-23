import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ComisionMotionAdmin, ComisionModeloAdmin } from "../../api/comisiones.api";
import { comisionesAdminApi } from "../../api/comisiones.api";
import { nombreTramoMotion } from "../../utils/tramoMotion";
import { ComisionCard } from "../comisiones/ComisionCard";
import { PublicarProductoModal } from "./PublicarProductoModal";
import { CompletarComisionModal } from "./CompletarComisionModal";
import { ComisionDetalleModal } from "./ComisionDetalleModal";

export type Item =
  | { tipo: "motion"; data: ComisionMotionAdmin }
  | { tipo: "modelo"; data: ComisionModeloAdmin };

export const SolicitudesComisionesTable: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [publicando, setPublicando] = useState<Item | null>(null);
  const [completando, setCompletando] = useState<Item | null>(null);
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

  // El estado ya no se elige a mano: el pago confirmado la pasa sola a "En
  // Proceso" y subir el archivo de entrega la pasa sola a "Completado" (ver
  // custom_orders/services.py y views.py en el backend). Cancelar es la
  // única transición que sigue siendo una decisión explícita del admin.
  const handleCancelar = async (item: Item) => {
    if (!window.confirm(t("comisionesAdmin.cancelConfirm"))) return;
    const key = `${item.tipo}-${item.data.id}`;
    setCancelandoId(key);
    try {
      const formData = new FormData();
      formData.append("estado", "CANCELADO");
      if (item.tipo === "motion") await comisionesAdminApi.actualizarSolicitudMotion(item.data.id, formData);
      else await comisionesAdminApi.actualizarSolicitudModelo(item.data.id, formData);
      cargar();
    } catch (err) {
      console.error("Error al cancelar la comisión:", err);
      window.alert(t("comisionesAdmin.cancelError"));
    } finally {
      setCancelandoId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-80 rounded-xl bg-surface-container-low animate-pulse border border-outline-variant/20" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-10 text-center text-on-surface-variant">
        {t("comisionesAdmin.empty")}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map((item) => {
          const key = `${item.tipo}-${item.data.id}`;
          const titulo = item.tipo === "motion" ? item.data.nombre_cancion : item.data.nombre_personaje;
          const subtitulo =
            item.tipo === "motion"
              ? `${nombreTramoMotion(item.data.tramo_personajes)} · ${item.data.nombre_juego}`
              : item.data.juego.nombre;
          const foto = item.tipo === "motion" ? item.data.foto_entrega : item.data.foto_entrega || item.data.foto_referencia_1;
          // Una comisión cancelada ya no se trabaja: no se le sube entrega ni
          // se publica (el backend tampoco la completaría — ver perform_update).
          const cancelada = item.data.estado === "CANCELADO";
          const puedeEntregar = !cancelada;
          const puedePublicar = !cancelada && Boolean(item.data.archivo_entrega) && !item.data.producto_publicado;
          const puedeCancelar = item.data.estado === "EN_PROCESO" || item.data.estado === "SOLICITADO";

          return (
            <ComisionCard
              key={key}
              onClick={() => setViendo(item)}
              tipoLabel={item.tipo === "motion" ? t("commissionsPage.motion") : t("commissionsPage.newModel")}
              estado={item.data.estado}
              titulo={titulo}
              subtitulo={`${item.data.usuario_nombre || t("comisionesAdmin.unknownUser")} · ${subtitulo}`}
              foto={foto}
              fotoIconoFallback={item.tipo === "motion" ? "music_note" : "view_in_ar"}
              codigoOrden={item.data.orden.codigo_orden}
              total={item.data.orden.total}
              fechaOrden={item.data.orden.fecha_orden}
              footer={
                <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {item.tipo === "motion" && (
                    <a
                      href={item.data.link_video}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-surface-container-lowest border border-outline-variant/50 px-3 py-1.5 rounded-md font-semibold hover:border-primary/50 transition-colors flex items-center gap-1 text-on-surface no-underline"
                    >
                      <span className="material-symbols-outlined text-[16px]">play_circle</span>
                      {t("comisionesAdmin.watchReference")}
                    </a>
                  )}
                  {puedeEntregar && (
                    <button
                      onClick={() => setCompletando(item)}
                      className="text-xs bg-surface-container-lowest border border-outline-variant/50 px-3 py-1.5 rounded-md font-semibold cursor-pointer hover:border-primary/50 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">upload_file</span>
                      {item.data.archivo_entrega ? t("comisionesAdmin.replaceFile") : t("comisionesAdmin.uploadDelivery")}
                    </button>
                  )}

                  {puedePublicar && (
                    <button
                      onClick={() => setPublicando(item)}
                      className="text-xs bg-primary-container text-on-primary-fixed px-3 py-1.5 rounded-md font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">storefront</span>
                      {t("comisionesAdmin.publishToShop")}
                    </button>
                  )}
                  {item.data.producto_publicado && (
                    <span className="text-xs text-primary-fixed-dim font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      {t("comisionesAdmin.published")}
                    </span>
                  )}

                  {puedeCancelar && (
                    <button
                      onClick={() => handleCancelar(item)}
                      disabled={cancelandoId === key}
                      className="text-xs bg-error/10 text-on-error-container border border-error/30 px-3 py-1.5 rounded-md font-semibold cursor-pointer hover:bg-error/20 transition-colors disabled:opacity-50 disabled:cursor-default flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                      {t("comisionesAdmin.cancelCommission")}
                    </button>
                  )}
                </div>
              }
            />
          );
        })}
      </div>

      <PublicarProductoModal
        item={publicando}
        onClose={() => setPublicando(null)}
        onPublicado={() => {
          setPublicando(null);
          cargar();
        }}
      />

      <CompletarComisionModal
        item={completando}
        onClose={() => setCompletando(null)}
        onCompletado={() => {
          setCompletando(null);
          cargar();
        }}
      />

      <ComisionDetalleModal item={viendo} onClose={() => setViendo(null)} />
    </div>
  );
};
