import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { GoogleLogin } from "@react-oauth/google"; // 1. Importar componente de Google
import { authApi } from "../services/authApi";
import { InputField } from "../components/ui/InputField";
import { Button } from "../components/ui/Button";
import { AuthCard } from "../components/ui/AuthCard";
import { Link } from "react-router-dom";

interface LoginPageProps {
  onLoginSuccess?: (isStaff: boolean, estadoSuscripcion: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await authApi.login({ email, password });

      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);

      const isStaff = Boolean(data.user?.is_staff);
      const estadoSuscripcion = data.user?.estado_suscripcion || "INACTIVO";
      localStorage.setItem("is_staff", String(isStaff));
      localStorage.setItem("estado_suscripcion", estadoSuscripcion);

      if (onLoginSuccess) {
        onLoginSuccess(isStaff, estadoSuscripcion);
      }
    } catch (err: any) {
      setError(t("login.error"));
    } finally {
      setLoading(false);
    }
  };

  // 2. NUEVA FUNCIÓN: Maneja la respuesta exitosa de Google
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError("");
    setLoading(true);
    try {
      const data = await authApi.googleLogin({
        token: credentialResponse.credential,
      });

      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);

      const isStaff = Boolean(data.user?.is_staff);
      const estadoSuscripcion = data.user?.estado_suscripcion || "INACTIVO";
      localStorage.setItem("is_staff", String(isStaff));
      localStorage.setItem("estado_suscripcion", estadoSuscripcion);

      if (onLoginSuccess) {
        onLoginSuccess(isStaff, estadoSuscripcion);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || t("login.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title={t("common.appName")}
      subtitle={t("login.subtitle")}
      description={t("login.description")}
    >
      {error && (
        <div className="bg-error/20 border border-error text-on-error-container p-3 rounded-md text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-6">
        <InputField
          id="email"
          label={t("login.email")}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="usuario@gmail.com"
          icon="mail"
          required
        />

        <InputField
            id="password"
            label={t("login.password")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            icon="lock"
            required
            isMono
            extraRightContent={
              <Link
                to="/forgot-password"
                className="text-xs font-mono text-primary hover:text-primary-fixed transition-colors"
              >
                {t("login.forgotPassword")}
              </Link>
            }
          />

        <Button type="submit" loading={loading} icon="login" className="mt-2">
          {t("login.submit")}
        </Button>
      </form>

      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-outline-variant/50"></div>
        <span className="flex-shrink-0 mx-4 text-on-surface-variant font-mono text-xs">
          {t("login.orContinueWith")}
        </span>
        <div className="flex-grow border-t border-outline-variant/50"></div>
      </div>

      {/* 3. Reemplazamos el botón estático de Google por el componente real */}
      <div className="flex flex-col gap-3 items-center w-full">
        <div className="w-full flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError(t("login.error"))}
            useOneTap={false}
            theme="outline"
            size="large"
            width="100%"
          />
        </div>
      </div>
    </AuthCard>
  );
};