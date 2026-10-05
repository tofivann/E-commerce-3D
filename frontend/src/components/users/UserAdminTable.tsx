import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Usuario } from "../../services/userApi";
import { userApi } from "../../services/userApi";
import { UserForm } from "./UserForm";
import { AjustarMonedasModal } from "./AjustarMonedasModal";
import { Monedas } from "../ui/Monedas";
import { SearchInput } from "../products/SearchInput";
import { TablaSkeleton } from "../ui/TablaSkeleton";
import { perfilStore } from "../../stores/perfilStore";
import { coincideBusqueda } from "../../utils/texto";

export const UserAdminTable: React.FC = () => {
  const { t } = useTranslation();

  const ROL_LABEL: Record<Usuario["rol"], string> = {
    CLIENTE: t("userForm.roleClient"),
    ADMIN: t("userForm.roleAdmin"),
  };

  const ESTADO_LABEL: Record<Usuario["estado_suscripcion"], string> = {
    INACTIVO: t("userForm.statusInactive"),
    PENDIENTE_PAGO: t("userForm.statusPending"),
    ACTIVO: t("userForm.statusActive"),
    NO_APLICA: t("userForm.statusNotApplicable"),
  };

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [ajustando, setAjustando] = useState<Usuario | null>(null);
  // Lista sin paginar: se filtra aquí mismo, sin acentos ni mayúsculas.
  const [busqueda, setBusqueda] = useState("");
  const visibles = usuarios.filter((u) => coincideBusqueda(busqueda, [u.nombre, u.username, u.email]));

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const data = await userApi.listar();
      setUsuarios(data);
      setError(null);
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
      setError(t("userAdminTable.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleDelete = async (usuario: Usuario) => {
    if (!window.confirm(t("userAdminTable.deleteConfirm", { username: usuario.username }))) {
      return;
    }
    setDeletingId(usuario.id);
    try {
      await userApi.eliminar(usuario.id);
      setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id));
    } catch (err) {
      console.error("Error al eliminar el usuario:", err);
      window.alert(t("userAdminTable.deleteError"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-on-surface mb-1">{t("userAdminTable.title")}</h2>
          <p className="text-on-surface-variant text-sm">{t("userAdminTable.subtitle")}</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-2 px-4 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          {t("userAdminTable.newUser")}
        </button>
      </div>

      <SearchInput value={busqueda} onChange={setBusqueda} placeholder={t("userAdminTable.search")} className="mb-4 max-w-md" />

      {error && (
        <div className="p-4 mb-4 bg-error/20 border border-error/50 rounded-md text-on-error-container text-center">
          {error}
        </div>
      )}

      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high/60 border-b border-outline-variant/30">
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">{t("userAdminTable.colUser")}</th>
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">{t("userAdminTable.colEmail")}</th>
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">{t("userAdminTable.colRole")}</th>
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">{t("userAdminTable.colSubscription")}</th>
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">{t("userAdminTable.colStatus")}</th>
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">{t("monedas.columna")}</th>
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold text-right">{t("userAdminTable.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loading && <TablaSkeleton columnas={7} />}

              {!loading && visibles.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                    {busqueda.trim() ? t("common.noResults", { query: busqueda.trim() }) : t("userAdminTable.empty")}
                  </td>
                </tr>
              )}

              {!loading &&
                visibles.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-surface-container-highest/30 transition-colors group">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant shrink-0 font-semibold uppercase">
                          {(usuario.nombre || usuario.username || "?").charAt(0)}
                        </div>
                        <div>
                          <div className="text-on-surface font-medium">{usuario.nombre || usuario.username}</div>
                          <div className="text-on-surface-variant text-xs font-mono">@{usuario.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6 font-mono text-on-surface-variant text-sm">{usuario.email}</td>
                    <td className="py-3 px-6">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-mono ${
                          usuario.rol === "ADMIN"
                            ? "border-secondary-container text-on-secondary-container bg-secondary-container/10"
                            : "border-outline/40 text-on-surface-variant bg-surface-container"
                        }`}
                      >
                        {ROL_LABEL[usuario.rol]}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-on-surface-variant text-sm">
                      {ESTADO_LABEL[usuario.estado_suscripcion]}
                    </td>
                    <td className="py-3 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          usuario.is_active ? "text-primary-fixed-dim" : "text-error"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            usuario.is_active ? "bg-primary-fixed-dim" : "bg-error"
                          }`}
                        />
                        {usuario.is_active ? t("userAdminTable.active") : t("userAdminTable.suspended")}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      {/* El saldo es también el botón para ajustarlo (regalo o corrección). */}
                      <button
                        onClick={() => setAjustando(usuario)}
                        aria-label={t("monedas.ajusteAbrir", { usuario: usuario.username })}
                        title={t("monedas.ajusteTitulo")}
                        className="inline-flex items-center gap-2 rounded-full border border-outline-variant/40 px-3 py-1 text-sm text-on-surface hover:border-primary/60 hover:bg-primary/10 transition-colors cursor-pointer"
                      >
                        <Monedas cantidad={usuario.saldo_monedas ?? 0} />
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant" aria-hidden="true">edit</span>
                      </button>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          aria-label={t("userAdminTable.edit")}
                          onClick={() => {
                            setEditing(usuario);
                            setFormOpen(true);
                          }}
                          className="p-1.5 rounded border border-outline-variant/40 text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          aria-label={t("userAdminTable.delete")}
                          disabled={deletingId === usuario.id}
                          onClick={() => handleDelete(usuario)}
                          className="p-1.5 rounded border border-outline-variant/40 text-on-surface-variant hover:text-error hover:border-error/50 transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <UserForm
        open={formOpen}
        usuario={editing}
        onClose={() => setFormOpen(false)}
        onSaved={fetchUsuarios}
      />

      {ajustando && (
        <AjustarMonedasModal
          usuario={ajustando}
          onCerrar={() => setAjustando(null)}
          onAjustado={(saldo) => {
            setUsuarios((prev) => prev.map((u) => (u.id === ajustando.id ? { ...u, saldo_monedas: saldo } : u)));
            // Si el admin ajustó su propia cuenta, que la cabecera lo refleje.
            perfilStore.recargar();
          }}
        />
      )}
    </div>
  );
};
