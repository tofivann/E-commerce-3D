import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Categoria } from "../../api/productos.api";
import { categoriasApi } from "../../api/productos.api";

const inputClass =
  "w-full bg-surface-variant border border-outline-variant rounded-md py-1.5 px-2 text-on-surface text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const addRowClass = "flex flex-col gap-2 p-4 md:table-row md:gap-0 md:p-0 bg-surface-container-lowest/50 md:bg-transparent";
const addCellClass = "block w-full md:table-cell md:w-auto py-0 md:py-2 px-0 md:px-4";

export const CategoriasTable: React.FC = () => {
  const { t } = useTranslation();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoNombreEn, setNuevoNombreEn] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    setLoading(true);
    categoriasApi
      .listar()
      .then(setCategorias)
      .catch((err) => console.error("Error al cargar categorías:", err))
      .finally(() => setLoading(false));
  };

  useEffect(cargar, []);

  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevoNombreEn.trim()) return;
    setGuardando(true);
    try {
      await categoriasApi.crear({ nombre: nuevoNombre.trim(), nombre_en: nuevoNombreEn.trim(), activo: true });
      setNuevoNombre("");
      setNuevoNombreEn("");
      cargar();
    } catch (err) {
      console.error("Error al crear la categoría:", err);
      window.alert(t("categoriasAdmin.createError"));
    } finally {
      setGuardando(false);
    }
  };

  const handleUpdate = async (categoria: Categoria, patch: Partial<Categoria>) => {
    try {
      await categoriasApi.actualizar(categoria.id, patch);
      cargar();
    } catch (err) {
      console.error("Error al actualizar la categoría:", err);
      window.alert(t("categoriasAdmin.updateError"));
    }
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      <div className="p-4 border-b border-outline-variant/30">
        <h3 className="font-bold text-on-surface">{t("categoriasAdmin.title")}</h3>
        <p className="text-on-surface-variant text-xs">{t("categoriasAdmin.subtitle")}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse md:table-fixed">
          <thead className="hidden md:table-header-group">
            <tr className="bg-surface-container-high/60 border-b border-outline-variant/30">
              <th className="py-2 px-4 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">{t("categoriasAdmin.colNameEs")}</th>
              <th className="py-2 px-4 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">{t("categoriasAdmin.colNameEn")}</th>
              <th className="py-2 px-4 text-xs uppercase tracking-wider text-on-surface-variant font-semibold w-44">{t("preciosComisiones.colActive")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20 flex flex-col md:table-row-group">
            {loading && (
              <tr><td colSpan={3} className="py-6 text-center text-on-surface-variant">{t("preciosComisiones.loading")}</td></tr>
            )}
            {!loading && categorias.map((categoria) => (
              <tr key={categoria.id} className="flex flex-col gap-2 p-4 md:table-row md:gap-0 md:p-0">
                <td className={addCellClass}>
                  <input
                    defaultValue={categoria.nombre}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== categoria.nombre && handleUpdate(categoria, { nombre: e.target.value.trim() })}
                    className={inputClass}
                  />
                </td>
                <td className={addCellClass}>
                  <input
                    defaultValue={categoria.nombre_en}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== categoria.nombre_en && handleUpdate(categoria, { nombre_en: e.target.value.trim() })}
                    className={inputClass}
                  />
                </td>
                <td className={addCellClass}>
                  <button
                    onClick={() => handleUpdate(categoria, { activo: !categoria.activo })}
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      categoria.activo ? "bg-primary-container/40 text-primary-fixed-dim" : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {categoria.activo ? t("preciosComisiones.active") : t("preciosComisiones.inactive")}
                  </button>
                </td>
              </tr>
            ))}
            <tr className={addRowClass}>
              <td className={addCellClass}>
                <input
                  className={inputClass}
                  placeholder={t("categoriasAdmin.namePlaceholder")}
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                />
              </td>
              <td className={addCellClass}>
                <input
                  className={inputClass}
                  placeholder={t("categoriasAdmin.namePlaceholderEn")}
                  value={nuevoNombreEn}
                  onChange={(e) => setNuevoNombreEn(e.target.value)}
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
