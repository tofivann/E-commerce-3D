import React from "react";
import { useTranslation } from "react-i18next";
import type { DatosRegistro } from "../../services/userApi";
import { Button } from "../ui/Button";
import { InputField } from "../ui/InputField";
import { PrecioSuscripcion } from "../ui/PrecioSuscripcion";

export interface FormularioRegistro extends DatosRegistro {
  passwordConfirm: string;
  terms: boolean;
}

interface DatosRegistroFormProps {
  valores: FormularioRegistro;
  onCambiar: (cambios: Partial<FormularioRegistro>) => void;
  onContinuar: () => void;
  enviando: boolean;
}

// Paso 1 del registro: los datos de la cuenta. Al continuar se manda el
// código de verificación al correo; aquí todavía no se crea ni se cobra nada.
export const DatosRegistroForm: React.FC<DatosRegistroFormProps> = ({ valores, onCambiar, onContinuar, enviando }) => {
  const { t } = useTranslation();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onContinuar();
      }}
      className="flex flex-col gap-3"
    >
      <InputField
        id="username"
        label={t("register.username")}
        type="text"
        value={valores.username}
        onChange={(e) => onCambiar({ username: e.target.value })}
        placeholder="janedoe99"
        icon="account_circle"
        required
      />

      <InputField
        id="fullName"
        label={t("register.fullName")}
        type="text"
        value={valores.nombre}
        onChange={(e) => onCambiar({ nombre: e.target.value })}
        placeholder="Jane Doe"
        icon="person"
        required
      />

      <InputField
        id="email"
        label={t("register.email")}
        type="email"
        value={valores.email}
        onChange={(e) => onCambiar({ email: e.target.value })}
        placeholder="jane@example.com"
        icon="mail"
        required
      />

      <InputField
        id="password"
        label={t("register.password")}
        type="password"
        value={valores.password}
        onChange={(e) => onCambiar({ password: e.target.value })}
        placeholder="••••••••"
        icon="lock"
        required
        isMono
      />

      <InputField
        id="passwordConfirm"
        label={t("register.passwordConfirm")}
        type="password"
        value={valores.passwordConfirm}
        onChange={(e) => onCambiar({ passwordConfirm: e.target.value })}
        placeholder="••••••••"
        icon="lock_reset"
        required
        isMono
      />

      <div className="flex items-start my-2">
        <div className="flex items-center h-5">
          <input
            className="w-4 h-4 rounded bg-surface border-outline-variant text-primary focus:ring-primary focus:ring-offset-background cursor-pointer"
            id="terms"
            name="terms"
            type="checkbox"
            checked={valores.terms}
            onChange={(e) => onCambiar({ terms: e.target.checked })}
            required
          />
        </div>
        <div className="ml-3 text-sm">
          <label className="text-on-surface-variant cursor-pointer" htmlFor="terms">
            {t("register.termsPrefix")}{" "}
            <a
              className="text-primary hover:underline underline-offset-4 decoration-primary/50 transition-colors font-medium"
              href="/terminos"
              target="_blank"
              rel="noreferrer"
            >
              {t("register.termsLink")}
            </a>
          </label>
        </div>
      </div>

      <PrecioSuscripcion className="text-primary justify-center" />

      <Button type="submit" loading={enviando} icon="arrow_forward" className="w-full">
        {t("register.continue")}
      </Button>
    </form>
  );
};
