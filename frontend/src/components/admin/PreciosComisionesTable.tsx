import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { JuegoComision, TramoPersonajesMotion } from "../../api/comisiones.api";
import { comisionesApi, comisionesAdminApi } from "../../api/comisiones.api";

const inputClass =
  "w-full bg-surface-variant border border-outline-variant rounded-md py-1.5 px-2 text-on-surface text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

// Fila de "agregar nuevo": en escritorio es una fila más de la tabla; en
// móvil se apila en columnas (una tabla no se reacomoda sola en pantallas angostas).
const addRowClass = "flex flex-col gap-2 p-4 md:table-row md:gap-0 md:p-0 bg-surface-container-lowest/50 md:bg-transparent";
const addCellClass = "block w-full md:table-cell md:w-auto py-0 md:py-2 px-0 md:px-4";

// ---------------------------------------------------------------------------
// Juegos (Comisión de Modelo Nuevo)
// ---------------------------------------------------------------------------

const JuegosTable: React.FC = () => {
  const { t } = useTranslation();
  const [juegos, setJuegos] = useState<JuegoComision[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    setLoading(true);
    comisionesApi
      .listarJuegos()
      .then(setJuegos)
      .catch((err) => console.error("Error al cargar juegos:", err))
      .finally(() => setLoading(false));
  };

  useEffect(cargar, []);

  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevoPrecio) return;
    setGuardando(true);
    try {
      await comisionesAdminApi.crearJuego({ nombre: nuevoNombre, precio: nuevoPrecio, activo: true });
      setNuevoNombre("");
      setNuevoPrecio("");
      cargar();
    } catch (err) {
      console.error("Error al crear el juego:", err);
      window.alert(t("preciosComisiones.createGameError"));
    } finally {
      setGuardando(false);
    }
  };

  const handleUpdate = async (juego: JuegoComision, patch: Partial<JuegoComision>) => {
    try {
      await comisionesAdminApi.actualizarJuego(juego.id, patch);
      cargar();
    } catch (err) {
      console.error("Error al actualizar el juego:", err);
      window.alert(t("preciosComisiones.updateError"));
    }
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      <div className="p-4 border-b border-outline-variant/30">
        <h3 className="font-bold text-on-surface">{t("preciosComisiones.gamesTitle")}</h3>
        <p className="text-on-surface-variant text-xs">{t("preciosComisiones.gamesSubtitle")}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse md:table-fixed">
          <thead className="hidden md:table-header-group">
            <tr className="bg-surface-container-high/60 border-b border-outline-variant/30">
              <th className="py-2 px-4 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">{t("preciosComisiones.colGame")}</th>
              <th className="py-2 px-4 text-xs uppercase tracking-wider text-on-surface-variant font-semibold w-32">{t("preciosComisiones.colPrice")}</th>
              <th className="py-2 px-4 text-xs uppercase tracking-wider text-on-surface-variant font-semibold w-44">{t("preciosComisiones.colActive")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20 flex flex-col md:table-row-group">
            {loading && (
              <tr><td colSpan={3} className="py-6 text-center text-on-surface-variant">{t("preciosComisiones.loading")}</td></tr>
            )}
            {!loading && juegos.map((juego) => (
              <tr key={juego.id} className="flex flex-col gap-2 p-4 md:table-row md:gap-0 md:p-0">
                <td className={addCellClass}>
                  <input
                    defaultValue={juego.nombre}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== juego.nombre && handleUpdate(juego, { nombre: e.target.value.trim() })}
                    className={inputClass}
                  />
                </td>
                <td className={addCellClass}>
                  <input
                    type="number" step="0.01" min="0" defaultValue={juego.precio}
                    onBlur={(e) => e.target.value !== String(juego.precio) && handleUpdate(juego, { precio: e.target.value })}
                    className={`${inputClass} md:max-w-[100px] font-mono`}
                  />
                </td>
                <td className={addCellClass}>
                  <button
                    onClick={() => handleUpdate(juego, { activo: !juego.activo })}
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      juego.activo ? "bg-primary-container/40 text-primary-fixed-dim" : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {juego.activo ? t("preciosComisiones.active") : t("preciosComisiones.inactive")}
                  </button>
                </td>
              </tr>
            ))}
            <tr className={addRowClass}>
              <td className={addCellClass}>
                <input
                  className={inputClass} placeholder={t("preciosComisiones.gameNamePlaceholder")}
                  value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)}
                />
              </td>
              <td className={addCellClass}>
                <input
                  type="number" step="0.01" min="0" className={`${inputClass} md:max-w-[100px]`} placeholder="0.00"
                  value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)}
                />
              </td>
              <td className={addCellClass}>
                <button
                  onClick={handleAgregar}
                  disabled={guardando}
                  className="w-full md:w-auto text-xs bg-primary-container text-on-primary-fixed px-3 py-2 md:py-1.5 rounded font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  {t("preciosComisiones.add")}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tramos de personajes (Comisión de Motion)
// ---------------------------------------------------------------------------

const emptyTramo = { nombre: "", min_personajes: "", max_personajes: "", precio: "" };

const TramosTable: React.FC = () => {
  const { t } = useTranslation();
  const [tramos, setTramos] = useState<TramoPersonajesMotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevo, setNuevo] = useState(emptyTramo);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    setLoading(true);
    comisionesApi
      .listarTramosMotion()
      .then(setTramos)
      .catch((err) => console.error("Error al cargar tramos:", err))
      .finally(() => setLoading(false));
  };

  useEffect(cargar, []);

  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevo.nombre || !nuevo.min_personajes || !nuevo.max_personajes || !nuevo.precio) return;
    setGuardando(true);
    try {
      await comisionesAdminApi.crearTramo({
        nombre: nuevo.nombre,
        min_personajes: Number(nuevo.min_personajes),
        max_personajes: Number(nuevo.max_personajes),
        precio: nuevo.precio,
        activo: true,
        orden_visualizacion: tramos.length,
      });
      setNuevo(emptyTramo);
      cargar();
    } catch (err) {
      console.error("Error al crear el tramo:", err);
      window.alert(t("preciosComisiones.createTramoError"));
    } finally {
      setGuardando(false);
    }
  };

  const handleUpdate = async (tramo: TramoPersonajesMotion, patch: Partial<TramoPersonajesMotion>) => {
    try {
      await comisionesAdminApi.actualizarTramo(tramo.id, patch);
      cargar();
    } catch (err) {
      console.error("Error al actualizar el tramo:", err);
      window.alert(t("preciosComisiones.updateError"));
    }
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      <div className="p-4 border-b border-outline-variant/30">
        <h3 className="font-bold text-on-surface">{t("preciosComisiones.tramosTitle")}</h3>
        <p className="text-on-surface-variant text-xs">{t("preciosComisiones.tramosSubtitle")}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse md:table-fixed">
          <thead className="hidden md:table-header-group">
            <tr className="bg-surface-container-high/60 border-b border-outline-variant/30">
              <th className="py-2 px-4 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">{t("preciosComisiones.colName")}</th>
              <th className="py-2 px-4 text-xs uppercase tracking-wider text-on-surface-variant font-semibold w-24">{t("preciosComisiones.colMin")}</th>
              <th className="py-2 px-4 text-xs uppercase tracking-wider text-on-surface-variant font-semibold w-24">{t("preciosComisiones.colMax")}</th>
              <th className="py-2 px-4 text-xs uppercase tracking-wider text-on-surface-variant font-semibold w-32">{t("preciosComisiones.colPrice")}</th>
              <th className="py-2 px-4 text-xs uppercase tracking-wider text-on-surface-variant font-semibold w-44">{t("preciosComisiones.colActive")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20 flex flex-col md:table-row-group">
            {loading && (
              <tr><td colSpan={5} className="py-6 text-center text-on-surface-variant">{t("preciosComisiones.loading")}</td></tr>
            )}
            {!loading && tramos.map((tramo) => (
              <tr key={tramo.id} className="flex flex-col gap-2 p-4 md:table-row md:gap-0 md:p-0">
                <td className={addCellClass}>
                  <input
                    defaultValue={tramo.nombre}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== tramo.nombre && handleUpdate(tramo, { nombre: e.target.value.trim() })}
                    className={inputClass}
                  />
                </td>
                <td className={addCellClass}>
                  <input
                    type="number" min="1" defaultValue={tramo.min_personajes} placeholder={t("preciosComisiones.minCharacters")}
                    onBlur={(e) => Number(e.target.value) !== tramo.min_personajes && handleUpdate(tramo, { min_personajes: Number(e.target.value) })}
                    className={`${inputClass} md:max-w-[70px] font-mono`}
                  />
                </td>
                <td className={addCellClass}>
                  <input
                    type="number" min="1" defaultValue={tramo.max_personajes} placeholder={t("preciosComisiones.maxCharacters")}
                    onBlur={(e) => Number(e.target.value) !== tramo.max_personajes && handleUpdate(tramo, { max_personajes: Number(e.target.value) })}
                    className={`${inputClass} md:max-w-[70px] font-mono`}
                  />
                </td>
                <td className={addCellClass}>
                  <input
                    type="number" step="0.01" min="0" defaultValue={tramo.precio}
                    onBlur={(e) => e.target.value !== String(tramo.precio) && handleUpdate(tramo, { precio: e.target.value })}
                    className={`${inputClass} md:max-w-[100px] font-mono`}
                  />
                </td>
                <td className={addCellClass}>
                  <button
                    onClick={() => handleUpdate(tramo, { activo: !tramo.activo })}
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      tramo.activo ? "bg-primary-container/40 text-primary-fixed-dim" : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {tramo.activo ? t("preciosComisiones.active") : t("preciosComisiones.inactive")}
                  </button>
                </td>
              </tr>
            ))}
            <tr className={addRowClass}>
              <td className={addCellClass}>
                <input className={inputClass} placeholder={t("preciosComisiones.tramoNamePlaceholder")} value={nuevo.nombre}
                  onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
              </td>
              <td className={addCellClass}>
                <input type="number" min="1" className={`${inputClass} md:max-w-[70px]`} placeholder={t("preciosComisiones.minCharacters")} value={nuevo.min_personajes}
                  onChange={(e) => setNuevo({ ...nuevo, min_personajes: e.target.value })} />
              </td>
              <td className={addCellClass}>
                <input type="number" min="1" className={`${inputClass} md:max-w-[70px]`} placeholder={t("preciosComisiones.maxCharacters")} value={nuevo.max_personajes}
                  onChange={(e) => setNuevo({ ...nuevo, max_personajes: e.target.value })} />
              </td>
              <td className={addCellClass}>
                <input type="number" step="0.01" min="0" className={`${inputClass} md:max-w-[100px]`} placeholder="0.00" value={nuevo.precio}
                  onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })} />
              </td>
              <td className={addCellClass}>
                <button
                  onClick={handleAgregar}
                  disabled={guardando}
                  className="w-full md:w-auto text-xs bg-primary-container text-on-primary-fixed px-3 py-2 md:py-1.5 rounded font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  {t("preciosComisiones.add")}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const PreciosComisionesTable: React.FC = () => (
  <div className="flex flex-col gap-6">
    <JuegosTable />
    <TramosTable />
  </div>
);
