import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { perfilApi, TAMANO_MAXIMO_FOTO_MB } from "../api/perfil.api";
import type { Perfil } from "../api/perfil.api";
import { AppLayout } from "../components/layout/AppLayout";
import { RecortarFotoModal } from "../components/perfil/RecortarFotoModal";
import { Avatar } from "../components/ui/Avatar";
import { usePerfil } from "../hooks/usePerfil";
import { perfilStore } from "../stores/perfilStore";
import { extraerErroresValidacion } from "../utils/erroresApi";

interface ProfilePageProps {
  isStaff?: boolean;
  isSubscribed?: boolean;
  onLogoutClick: () => void;
}

type Aviso = { tipo: "ok" | "error"; texto: string } | null;

const inputClass =
  "w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner";
const labelClass = "block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2";

// "Mi perfil": el usuario ve sus datos y cambia su foto y su nombre. Lo demás
// (correo, suscripción) es de solo lectura; la contraseña se cambia por el
// flujo de correo que ya existe. Disponible para cualquier cuenta con sesión.
export const ProfilePage: React.FC<ProfilePageProps> = ({ isStaff = false, isSubscribed = false, onLogoutClick }) => {
  const { t } = useTranslation();
  const { perfil, fase } = usePerfil();

  return (
    <AppLayout isStaff={isStaff} hasAccess={isStaff || isSubscribed} onLogout={onLogoutClick} mainClassName="flex flex-col gap-6">
      <div className="border-b border-outline-variant/20 pb-4">
        <h1 className="text-2xl font-bold text-on-surface">{t("perfil.title")}</h1>
        <p className="text-on-surface-variant text-sm mt-1">{t("perfil.subtitle")}</p>
      </div>

      {fase === "error" && (
        <div className="p-4 bg-error/20 border border-error/50 rounded-md text-on-error-container text-center">
          {t("perfil.loadError")}
        </div>
      )}
      {(fase === "vacio" || fase === "cargando") && (
        <div className="glass-panel rounded-xl p-6 md:p-8 max-w-2xl h-72 animate-pulse" aria-hidden="true" />
      )}
      {/* key: si cambia la cuenta, el formulario arranca limpio con sus datos. */}
      {perfil && <FormularioPerfil key={perfil.id} perfil={perfil} />}
    </AppLayout>
  );
};

const FormularioPerfil: React.FC<{ perfil: Perfil }> = ({ perfil }) => {
  const { t, i18n } = useTranslation();
  const inputFoto = useRef<HTMLInputElement>(null);
  // null = el usuario no ha tocado el campo: se muestra el nombre guardado.
  const [nombreEditado, setNombreEditado] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<"foto" | "nombre" | null>(null);
  const [avisoFoto, setAvisoFoto] = useState<Aviso>(null);
  const [avisoNombre, setAvisoNombre] = useState<Aviso>(null);
  // Foto elegida pendiente de encuadrar (dirección local del archivo).
  const [fotoPorRecortar, setFotoPorRecortar] = useState<string | null>(null);

  const nombre = nombreEditado ?? perfil.nombre;
  const nombreCambio = nombre.trim() !== perfil.nombre && nombre.trim() !== "";

  // Paso 1: el usuario elige un archivo → se valida y se abre el encuadre.
  const elegirFoto = (archivo: File | undefined) => {
    if (!archivo) return;
    setAvisoFoto(null);
    if (!archivo.type.startsWith("image/")) {
      setAvisoFoto({ tipo: "error", texto: t("perfil.photoNotImage") });
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_FOTO_MB * 1024 * 1024) {
      setAvisoFoto({ tipo: "error", texto: t("perfil.photoTooBig", { mb: TAMANO_MAXIMO_FOTO_MB }) });
      return;
    }
    setFotoPorRecortar(URL.createObjectURL(archivo));
  };

  const cerrarRecorte = () => {
    if (fotoPorRecortar) URL.revokeObjectURL(fotoPorRecortar);
    setFotoPorRecortar(null);
  };

  // Paso 2: confirma el encuadre → se sube solo esa parte.
  const subirFoto = async (recorte: Blob) => {
    cerrarRecorte();
    setOcupado("foto");
    try {
      perfilStore.establecer(await perfilApi.subirFoto(new File([recorte], "perfil.jpg", { type: "image/jpeg" })));
      setAvisoFoto({ tipo: "ok", texto: t("perfil.photoSaved") });
    } catch (err) {
      console.error("Error al subir la foto de perfil:", err);
      setAvisoFoto({ tipo: "error", texto: extraerErroresValidacion(err)?.foto_perfil ?? t("perfil.photoError") });
    } finally {
      setOcupado(null);
    }
  };

  const quitarFoto = async () => {
    setAvisoFoto(null);
    setOcupado("foto");
    try {
      perfilStore.establecer(await perfilApi.quitarFoto());
      setAvisoFoto({ tipo: "ok", texto: t("perfil.photoRemoved") });
    } catch (err) {
      console.error("Error al quitar la foto de perfil:", err);
      setAvisoFoto({ tipo: "error", texto: t("perfil.photoError") });
    } finally {
      setOcupado(null);
    }
  };

  const guardarNombre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCambio) return;
    setAvisoNombre(null);
    setOcupado("nombre");
    try {
      perfilStore.establecer(await perfilApi.cambiarNombre(nombre.trim()));
      setNombreEditado(null);
      setAvisoNombre({ tipo: "ok", texto: t("perfil.nameSaved") });
    } catch (err) {
      console.error("Error al guardar el nombre:", err);
      setAvisoNombre({ tipo: "error", texto: extraerErroresValidacion(err)?.nombre ?? t("perfil.nameError") });
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="glass-panel rounded-xl p-6 md:p-8 max-w-2xl flex flex-col gap-8">
      {/* ---- Foto ---- */}
      <section className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <Avatar foto={perfil.foto_perfil} nombre={perfil.nombre || perfil.username} tamano="lg" />
        <div className="flex flex-col gap-3 items-center sm:items-start min-w-0">
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <button
              type="button"
              onClick={() => inputFoto.current?.click()}
              disabled={ocupado !== null}
              className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-2 px-4 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              {ocupado === "foto" ? t("perfil.saving") : perfil.foto_perfil ? t("perfil.changePhoto") : t("perfil.uploadPhoto")}
            </button>
            {perfil.foto_perfil && (
              <button
                type="button"
                onClick={quitarFoto}
                disabled={ocupado !== null}
                className="border border-outline-variant/60 text-on-surface-variant rounded-lg py-2 px-4 font-semibold hover:border-error/60 hover:text-error transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                {t("perfil.removePhoto")}
              </button>
            )}
          </div>
          <p className="text-on-surface-variant text-xs">{t("perfil.photoHelp", { mb: TAMANO_MAXIMO_FOTO_MB })}</p>
          <AvisoLinea aviso={avisoFoto} />
          <input
            ref={inputFoto}
            id="fotoPerfilInput"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              elegirFoto(e.target.files?.[0]);
              // Permite volver a elegir el mismo archivo tras un error.
              e.target.value = "";
            }}
          />
        </div>
      </section>

      {/* ---- Nombre ---- */}
      <form onSubmit={guardarNombre} className="flex flex-col gap-2 border-t border-outline-variant/30 pt-6">
        <label htmlFor="perfilNombre" className={labelClass}>
          {t("perfil.name")}
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="perfilNombre"
            maxLength={150}
            className={inputClass}
            value={nombre}
            onChange={(e) => {
              setNombreEditado(e.target.value);
              setAvisoNombre(null);
            }}
          />
          <button
            type="submit"
            disabled={!nombreCambio || ocupado !== null}
            className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-3 px-6 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {ocupado === "nombre" ? t("perfil.saving") : t("perfil.save")}
          </button>
        </div>
        <AvisoLinea aviso={avisoNombre} />
      </form>

      {/* ---- Datos de la cuenta (solo lectura) ---- */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 border-t border-outline-variant/30 pt-6">
        <Dato etiqueta={t("perfil.username")}>@{perfil.username}</Dato>
        <Dato etiqueta={t("perfil.email")}>
          <span className="break-all">{perfil.email}</span>
        </Dato>
        <Dato etiqueta={t("perfil.subscription")}>
          {perfil.is_staff ? t("perfil.admin") : t(`perfil.subscriptionState.${perfil.estado_suscripcion}`)}
        </Dato>
        <Dato etiqueta={t("perfil.memberSince")}>
          {new Date(perfil.fecha_registro).toLocaleDateString(i18n.language, { year: "numeric", month: "long", day: "numeric" })}
        </Dato>
      </dl>

      {fotoPorRecortar && (
        <RecortarFotoModal imagenUrl={fotoPorRecortar} onCancelar={cerrarRecorte} onConfirmar={subirFoto} />
      )}

      {/* ---- Contraseña ---- */}
      <section className="border-t border-outline-variant/30 pt-6 flex flex-col gap-2">
        <span className={labelClass}>{t("perfil.password")}</span>
        <p className="text-on-surface-variant text-sm">{t("perfil.passwordHelp")}</p>
        <Link to="/forgot-password" className="text-primary font-semibold hover:underline no-underline self-start inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">lock_reset</span>
          {t("perfil.changePassword")}
        </Link>
      </section>
    </div>
  );
};

const Dato: React.FC<{ etiqueta: string; children: React.ReactNode }> = ({ etiqueta, children }) => (
  <div className="min-w-0">
    <dt className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-1">{etiqueta}</dt>
    <dd className="text-on-surface">{children}</dd>
  </div>
);

const AvisoLinea: React.FC<{ aviso: Aviso }> = ({ aviso }) =>
  aviso ? (
    <p role="status" className={`text-xs ${aviso.tipo === "ok" ? "text-primary" : "text-error"}`}>
      {aviso.texto}
    </p>
  ) : null;
