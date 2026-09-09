import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/Button";
import { useVerificacionPago } from "../hooks/useVerificacionPago";

export const RegisterSuccessPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  // Sondea al backend (que a su vez confirma con Stripe) hasta que la
  // suscripción quede ACTIVO de verdad, en vez de asumir éxito de inmediato.
  const estado = useVerificacionPago(sessionId);

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex items-center justify-center p-4 w-full">
      <div className="w-full max-w-md glass-panel rounded-2xl p-8 shadow-2xl border border-outline-variant/20 bg-surface-container-low/60 text-center">
        {estado === "cargando" && (
          <>
            <div className="mx-auto flex items-center justify-center w-16 h-16 mb-6">
              <div className="w-14 h-14 rounded-full border-4 border-outline-variant/40 border-t-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-on-surface mb-2 tracking-tight">
              {t("registerSuccess.confirmingTitle")}
            </h1>
            <p className="text-sm md:text-base text-on-surface-variant">
              {t("registerSuccess.confirmingBody")}
            </p>
          </>
        )}

        {estado === "activo" && (
          <>
            {/* Icono de éxito */}
            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 text-primary mb-6">
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>

            <h1 className="text-2xl font-bold text-on-surface mb-2 tracking-tight">
              {t("registerSuccess.successTitle")}
            </h1>

            <p className="text-sm md:text-base text-on-surface-variant mb-8">
              {t("registerSuccess.successBody")}
            </p>

            <Link to="/login">
              <Button className="w-full" icon="login">
                {t("registerSuccess.goToLogin")}
              </Button>
            </Link>
          </>
        )}

        {estado === "expirado" && (
          <>
            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 mb-6">
              <span className="material-symbols-outlined text-3xl">hourglass_top</span>
            </div>
            <h1 className="text-2xl font-bold text-on-surface mb-2 tracking-tight">
              {t("registerSuccess.expiredTitle")}
            </h1>
            <p className="text-sm md:text-base text-on-surface-variant mb-8">
              {t("registerSuccess.expiredBody")}
            </p>
            <Link to="/login">
              <Button className="w-full" icon="login">
                {t("registerSuccess.goToLogin")}
              </Button>
            </Link>
          </>
        )}

        {estado === "error" && (
          <>
            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 mb-6">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>
            <h1 className="text-2xl font-bold text-on-surface mb-2 tracking-tight">
              {t("registerSuccess.errorTitle")}
            </h1>
            <p className="text-sm md:text-base text-on-surface-variant mb-8">
              {t("registerSuccess.errorBody")}
            </p>
            <Link to="/login">
              <Button className="w-full" icon="login">
                {t("registerSuccess.goToLogin")}
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};