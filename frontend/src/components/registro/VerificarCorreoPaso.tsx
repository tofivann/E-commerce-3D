import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";

export const LONGITUD_CODIGO = 6;

interface VerificarCorreoPasoProps {
  email: string;
  vigenciaMinutos: number;
  // Segundos que faltan para poder pedir otro código (0 = ya se puede).
  esperaReenvio: number;
  ocupado: boolean;
  onVerificar: (codigo: string) => void;
  onReenviar: () => void;
  onCambiarCorreo: () => void;
}

// Paso 2 del registro: el usuario escribe el código que llegó a su correo.
export const VerificarCorreoPaso: React.FC<VerificarCorreoPasoProps> = ({
  email,
  vigenciaMinutos,
  esperaReenvio,
  ocupado,
  onVerificar,
  onReenviar,
  onCambiarCorreo,
}) => {
  const { t } = useTranslation();
  const [codigo, setCodigo] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (codigo.length === LONGITUD_CODIGO) onVerificar(codigo);
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">mark_email_unread</span>
          {t("register.codeTitle")}
        </h2>
        <p className="text-sm text-on-surface-variant mt-1 break-words">
          {t("register.codeBody", { email, minutos: vigenciaMinutos })}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase" htmlFor="codigoVerificacion">
          {t("register.codeLabel")}
        </label>
        <input
          id="codigoVerificacion"
          name="codigoVerificacion"
          // type="text" + inputMode: teclado numérico sin las flechas ni el
          // recorte de ceros a la izquierda de type="number".
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={LONGITUD_CODIGO}
          placeholder={"0".repeat(LONGITUD_CODIGO)}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, LONGITUD_CODIGO))}
          className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner font-mono text-2xl tracking-[0.5em] text-center"
        />
      </div>

      <Button type="submit" loading={ocupado} disabled={codigo.length !== LONGITUD_CODIGO} icon="verified" className="w-full">
        {t("register.codeVerify")}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
        <button
          type="button"
          onClick={onReenviar}
          disabled={ocupado || esperaReenvio > 0}
          className="text-primary font-semibold rounded-lg py-1 px-2 -mx-2 hover:bg-primary/10 transition-colors disabled:text-on-surface-variant disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
        >
          {esperaReenvio > 0 ? t("register.codeResendIn", { segundos: esperaReenvio }) : t("register.codeResend")}
        </button>
        <button
          type="button"
          onClick={onCambiarCorreo}
          disabled={ocupado}
          className="text-on-surface-variant font-semibold rounded-lg py-1 px-2 -mx-2 hover:bg-surface-container-low hover:text-on-surface transition-colors disabled:opacity-50 cursor-pointer"
        >
          {t("register.codeChangeEmail")}
        </button>
      </div>

      <p className="text-xs text-on-surface-variant">{t("register.codeSpamHint")}</p>
    </form>
  );
};
