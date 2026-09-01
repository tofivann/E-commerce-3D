import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useVerificacionPago } from "../hooks/useVerificacionPago";

export const RegisterSuccessPage: React.FC = () => {
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
              Confirmando tu pago...
            </h1>
            <p className="text-sm md:text-base text-on-surface-variant">
              Estamos confirmando tu pago con Stripe de forma segura. Esto tomará solo un segundo.
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
              ¡Pago y Registro Exitosos!
            </h1>

            <p className="text-sm md:text-base text-on-surface-variant mb-8">
              Tu cuenta ha sido activada correctamente. Ya puedes iniciar sesión en la plataforma para comenzar a disfrutar de todos los beneficios.
            </p>

            <Link to="/login">
              <Button className="w-full" icon="login">
                Ir a Iniciar Sesión
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
              Tu pago está tardando en confirmarse
            </h1>
            <p className="text-sm md:text-base text-on-surface-variant mb-8">
              Si ya realizaste el pago, tu cuenta se activará automáticamente en breve. Intenta iniciar sesión en unos minutos.
            </p>
            <Link to="/login">
              <Button className="w-full" icon="login">
                Ir a Iniciar Sesión
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
              No pudimos confirmar tu pago
            </h1>
            <p className="text-sm md:text-base text-on-surface-variant mb-8">
              Si realizaste el pago correctamente, tu cuenta se activará automáticamente en unos minutos.
            </p>
            <Link to="/login">
              <Button className="w-full" icon="login">
                Ir a Iniciar Sesión
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};