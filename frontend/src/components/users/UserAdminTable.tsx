import React, { useEffect, useState } from "react";
import type { Usuario } from "../../services/userApi";
import { userApi } from "../../services/userApi";
import { UserForm } from "./UserForm";

const ROL_LABEL: Record<Usuario["rol"], string> = {
  CLIENTE: "Cliente",
  ADMIN: "Administrador",
};

const ESTADO_LABEL: Record<Usuario["estado_suscripcion"], string> = {
  INACTIVO: "Inactivo",
  PENDIENTE_PAGO: "Pendiente de pago",
  ACTIVO: "Activo",
  NO_APLICA: "No aplica",
};

export const UserAdminTable: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const data = await userApi.listar();
      setUsuarios(data);
      setError(null);
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
      setError("No se pudieron cargar los usuarios del servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleDelete = async (usuario: Usuario) => {
    if (!window.confirm(`¿Eliminar al usuario "${usuario.username}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    setDeletingId(usuario.id);
    try {
      await userApi.eliminar(usuario.id);
      setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id));
    } catch (err) {
      console.error("Error al eliminar el usuario:", err);
      window.alert("No se pudo eliminar el usuario.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-on-surface mb-1">Usuarios</h2>
          <p className="text-on-surface-variant text-sm">Gestiona el acceso, el rol y la suscripción de cada cuenta.</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-2 px-4 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Nuevo usuario
        </button>
      </div>

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
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Usuario</th>
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Email</th>
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Rol</th>
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Suscripción</th>
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Estado</th>
                <th className="py-3 px-6 text-xs uppercase tracking-wider text-on-surface-variant font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                    Cargando usuarios...
                  </td>
                </tr>
              )}

              {!loading && usuarios.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}

              {!loading &&
                usuarios.map((usuario) => (
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
                        {usuario.is_active ? "Activo" : "Suspendido"}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          aria-label="Editar"
                          onClick={() => {
                            setEditing(usuario);
                            setFormOpen(true);
                          }}
                          className="p-1.5 rounded border border-outline-variant/40 text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          aria-label="Eliminar"
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
    </div>
  );
};
