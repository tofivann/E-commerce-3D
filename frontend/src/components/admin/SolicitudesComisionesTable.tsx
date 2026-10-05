import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { EstadoComision } from "../../api/comisiones.api";
import { comisionesAdminApi } from "../../api/comisiones.api";
import type { Categoria } from "../../api/productos.api";
import { categoriasApi } from "../../api/productos.api";
import { nombreTramoMotion } from "../../utils/tramoMotion";
import { claveEtiquetaEstado } from "../../utils/estadoComision";
import { FILTROS_COMISIONES_VACIOS, filtrarComisiones } from "../../utils/comisiones";
import type { FiltrosComisiones, ItemComision } from "../../utils/comisiones";
import { ComisionCard } from "../comisiones/ComisionCard";
import { CategoryFilter } from "../products/CategoryFilter";
import { FiltroChips } from "../ui/FiltroChips";
import { SearchInput } from "../products/SearchInput";
import { CompletarComisionModal } from "./CompletarComisionModal";
import { ComisionDetalleModal } from "./ComisionDetalleModal";
import { fotoTarjetaComision } from "../../utils/imagenComision";

// Los modales de esta carpeta importan `Item` desde aquí; el tipo real vive
// en utils/comisiones.ts junto con la lógica de filtrado.
export type Item = ItemComision;

// Orden de los chips de estado. SOLICITADO va al final: es el transitorio
// "Confirmando pago", rara vez es lo que se busca.
const ESTADOS_FILTRO: EstadoComision[] = ["EN_PROCESO", "COMPLETADO", "CANCELADO", "SOLICITADO"];

// Valor del chip "Todas" (sin filtro por estado).
const TODOS_LOS_ESTADOS = "TODAS";

export const SolicitudesComisionesTable: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  // Filtros en memoria: la lista de comisiones no es paginada (llega
  // completa, como la biblioteca), así que no hace falta ir al servidor.
  const [filtros, setFiltros] = useState<FiltrosComisiones>(FILTROS_COMISIONES_VACIOS);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  // Un solo modal para entregar y para publicar: "Publicar a la tienda" lo
  // abre con "publicar al guardar" ya marcado (los datos de reventa viven en
  // la comisión y se completan ahí mismo — no hay formulario de publicar aparte).
  const [completando, setCompletando] = useState<Item | null>(null);
  const [publicarAlAbrir, setPublicarAlAbrir] = useState(false);
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
    categoriasApi
      .listar()
      .then(setCategorias)
      .catch((err) => console.error("Error al cargar categorías:", err));
  }, []);

  const itemsFiltrados = useMemo(() => filtrarComisiones(items, filtros), [items, filtros]);
  const hayFiltros =
    filtros.estado !== null || filtros.categorias.size > 0 || filtros.texto.trim() !== "";
  const actualizarFiltros = (cambios: Partial<FiltrosComisiones>) =>
    setFiltros((prev) => ({ ...prev, ...cambios }));

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
      {/* ---- Filtros: texto, estado y categorías (AND entre todos) ---- */}
      <div className="flex flex-col gap-4 mb-6">
        <SearchInput
          value={filtros.texto}
          onChange={(texto) => actualizarFiltros({ texto })}
          placeholder={t("comisionesAdmin.searchPlaceholder")}
          className="max-w-sm"
        />

        <FiltroChips<EstadoComision | typeof TODOS_LOS_ESTADOS>
          titulo={t("comisionesAdmin.filterStatus")}
          opciones={[
            { valor: TODOS_LOS_ESTADOS, etiqueta: t("comisionesAdmin.filterAll") },
            ...ESTADOS_FILTRO.map((estado) => ({ valor: estado, etiqueta: t(claveEtiquetaEstado(estado)) })),
          ]}
          seleccionado={filtros.estado ?? TODOS_LOS_ESTADOS}
          // Pulsar el estado ya activo lo quita (vuelve a "Todas"), como antes.
          onChange={(valor) =>
            actualizarFiltros({ estado: valor === TODOS_LOS_ESTADOS || valor === filtros.estado ? null : valor })
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant mr-1">
            {t("comisionesAdmin.filterCategory")}
          </span>
          <CategoryFilter
            categorias={categorias}
            seleccionadas={filtros.categorias}
            onChange={(categorias) => actualizarFiltros({ categorias })}
          />
        </div>
      </div>

      {itemsFiltrados.length === 0 && hayFiltros && (
        <div className="glass-panel rounded-xl p-10 text-center text-on-surface-variant">
          {t("comisionesAdmin.noResultsFilters")}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {itemsFiltrados.map((item) => {
          const key = `${item.tipo}-${item.data.id}`;
          const titulo = item.tipo === "motion" ? item.data.nombre_cancion : item.data.nombre_personaje;
          const subtitulo =
            item.tipo === "motion"
              ? `${nombreTramoMotion(item.data.tramo_personajes)} · ${item.data.nombre_juego}`
              : item.data.juego.nombre;
          const foto = fotoTarjetaComision(item);
          // Una comisión cancelada ya no se trabaja: no se le sube entrega ni
          // se publica (el backend tampoco la completaría — ver perform_update).
          const cancelada = item.data.estado === "CANCELADO";
          const puedeEntregar = !cancelada;
          const puedePublicar = !cancelada && Boolean(item.data.archivo_entrega_nombre) && !item.data.producto_publicado;
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
                  {puedeEntregar && (
                    <button
                      onClick={() => {
                        setPublicarAlAbrir(false);
                        setCompletando(item);
                      }}
                      className="text-xs bg-surface-container-lowest border border-outline-variant/50 px-3 py-1.5 rounded-md font-semibold cursor-pointer hover:border-primary/50 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">upload_file</span>
                      {item.data.archivo_entrega_nombre ? t("comisionesAdmin.replaceFile") : t("comisionesAdmin.uploadDelivery")}
                    </button>
                  )}

                  {puedePublicar && (
                    <button
                      onClick={() => {
                        setPublicarAlAbrir(true);
                        setCompletando(item);
                      }}
                      className="text-xs bg-primary-container text-on-primary-fixed px-3 py-1.5 rounded-md font-semibold cursor-pointer hover:bg-primary-fixed-dim transition-colors flex items-center gap-1"
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

      <CompletarComisionModal
        item={completando}
        publicarAlAbrir={publicarAlAbrir}
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
