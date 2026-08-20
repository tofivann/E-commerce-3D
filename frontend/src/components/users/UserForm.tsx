import React, { useEffect, useState } from "react";
import type { Usuario } from "../../services/userApi";
import { userApi } from "../../services/userApi";

interface UserFormProps {
  open: boolean;
  usuario?: Usuario | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm = {
  username: "",
  email: "",
  nombre: "",
  rol: "CLIENTE" as Usuario["rol"],
  estado_suscripcion: "PENDIENTE_PAGO" as Usuario["estado_suscripcion"],
  is_active: true,
  password: "",
};

export const UserForm: React.FC<UserFormProps> = ({
  open,
  usuario,
  onClose,
  onSaved,
}) => {
  const isEdit = Boolean(usuario?.id);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (usuario) {
      setForm({
        username: usuario.username || "",
        email: usuario.email || "",
        nombre: usuario.nombre || "",
        rol: usuario.rol || "CLIENTE",
        estado_suscripcion: usuario.estado_suscripcion || "PENDIENTE_PAGO",
        is_active: usuario.is_active ?? true,
        password: "",
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [usuario, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isEdit && !form.password) {
      setError("Debes definir una contraseña para el nuevo usuario.");
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Usuario> = {
        username: form.username,
        email: form.email,
        nombre: form.nombre,
        rol: form.rol,
        estado_suscripcion: form.estado_suscripcion,
        is_active: form.is_active,
      };
      if (form.password) {
        payload.password = form.password;
      }

      if (isEdit && usuario?.id) {
        await userApi.actualizar(usuario.id, payload);
      } else {
        await userApi.crear(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error("Error al guardar el usuario:", err);
      setError("No se pudo guardar el usuario. Revisa los datos e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel relative w-full max-w-xl rounded-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto bg-surface-container-lowest/95">
        <button
          type="button"
          className="absolute top-6 right-6 text-on-surface-variant hover:text-primary transition-colors"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="text-2xl font-bold text-on-surface mb-2">
          {isEdit ? "Editar Usuario" : "Nuevo Usuario"}
        </h2>
        <p className="text-on-surface-variant mb-6">
          {isEdit
            ? "Actualiza el rol, la suscripción o los datos de acceso."
            : "Crea una cuenta y define su rol dentro de la plataforma."}
        </p>

        {error && (
          <div className="bg-error/20 border border-error text-on-error-container p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
                Nombre de usuario
              </label>
              <input
                required
                className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
                Nombre completo
              </label>
              <input
                required
                className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
              Correo electrónico
            </label>
            <input
              required
              type="email"
              className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
                Rol
              </label>
              <select
                className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner appearance-none"
                value={form.rol}
                onChange={(e) =>
                  setForm({ ...form, rol: e.target.value as Usuario["rol"] })
                }
              >
                <option value="CLIENTE">Cliente</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
                Estado de suscripción
              </label>
              <select
                className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner appearance-none"
                value={form.estado_suscripcion}
                onChange={(e) =>
                  setForm({
                    ...form,
                    estado_suscripcion: e.target.value as Usuario["estado_suscripcion"],
                  })
                }
              >
                <option value="INACTIVO">Inactivo</option>
                <option value="PENDIENTE_PAGO">Pendiente de pago</option>
                <option value="ACTIVO">Activo</option>
                <option value="NO_APLICA">No aplica</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
              {isEdit ? "Nueva contraseña (opcional)" : "Contraseña"}
            </label>
            <input
              type="password"
              required={!isEdit}
              placeholder={isEdit ? "Dejar en blanco para no cambiarla" : ""}
              className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded bg-surface-variant border-outline-variant text-primary focus:ring-primary"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            <span className="text-on-surface">Cuenta activa (puede iniciar sesión)</span>
          </label>

          <div className="flex justify-end gap-4 pt-4 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-2.5 px-8 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isEdit ? "save" : "person_add"}
              </span>
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
