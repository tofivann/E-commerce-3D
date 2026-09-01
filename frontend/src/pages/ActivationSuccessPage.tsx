import React from "react";
import { useSearchParams } from "react-router-dom";
import { useVerificacionPago } from "../hooks/useVerificacionPago";

export const ActivationSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  // Sondea al backend (que a su vez confirma con Stripe) hasta que la
  // suscripción quede ACTIVO de verdad, en vez de asumir éxito de inmediato.
  const estado = useVerificacionPago(sessionId);

  const handleContinuarAlLogin = () => {
    // Limpiamos el almacenamiento local para forzar 
    // a que el frontend recargue el nuevo estado ACTIVO desde el backend al volver a iniciar sesión.
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("is_staff");
    localStorage.removeItem("estado_suscripcion");

    // Redirigimos al login
    window.location.href = "/login";
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col items-center justify-center p-6 md:p-16 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-container/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary-container/15 rounded-full blur-[120px] pointer-events-none" />

      <main className="w-full max-w-[600px] z-10 glass-panel rounded-xl p-8 md:p-12 text-center shadow-2xl">
        {!sessionId && (
          <div>
            <p className="text-on-surface-variant mb-4">
              No encontramos ninguna sesión de pago activa.
            </p>
            <a href="/" className="text-primary-fixed-dim font-semibold hover:underline no-underline">
              Volver al inicio →
            </a>
          </div>
        )}

        {sessionId && estado === "cargando" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full border-4 border-outline-variant/40 border-t-primary-container animate-spin" />
            <h2 className="text-xl font-bold text-on-surface">Activando tu cuenta...</h2>
            <p className="text-on-surface-variant text-sm">
              Estamos confirmando tu pago con Stripe de forma segura. Esto tomará solo un segundo.
            </p>
          </div>
        )}

        {sessionId && estado === "activo" && (
          <div className="flex flex-col items-center gap-6">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary-container/15 border border-primary-container/40">
              <span className="material-symbols-outlined text-[64px] text-primary-fixed-dim">
                celebration
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-on-surface mb-2">
                ¡Pago Exitoso y Cuenta Activada! 🎉
              </h1>
              <p className="text-on-surface-variant">
                Tu transacción se ha completado correctamente y tu suscripción ya está activa. Por favor, inicia sesión para ingresar a la plataforma con acceso total.
              </p>
            </div>
            
            <button
              onClick={handleContinuarAlLogin}
              className="w-full py-3 px-6 rounded-lg bg-primary-container text-on-primary-fixed font-semibold hover:bg-primary-fixed-dim transition-all no-underline shadow-lg cursor-pointer"
            >
              Iniciar Sesión en la Plataforma
            </button>
          </div>
        )}

        {sessionId && estado === "expirado" && (
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-[48px] text-amber-500">hourglass_top</span>
            <p className="text-on-surface">
              La activación está tardando más de lo normal en confirmarse.
            </p>
            <p className="text-on-surface-variant text-sm">
              Esto puede pasar si el webhook de Stripe todavía no llega. Si ya realizaste el pago,
              tu cuenta se activará automáticamente en breve — intenta iniciar sesión en unos minutos.
            </p>
            <a
              href="/login"
              className="mt-4 px-6 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-semibold no-underline hover:bg-surface-container inline-block"
            >
              Ir al inicio de sesión
            </a>
          </div>
        )}

        {sessionId && estado === "error" && (
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-[48px] text-amber-500">warning</span>
            <p className="text-on-surface">
              No pudimos confirmar los detalles de la sesión. Si realizaste el pago correctamente, tu cuenta se activará automáticamente en unos minutos.
            </p>
            <a
              href="/login"
              className="mt-4 px-6 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-semibold no-underline hover:bg-surface-container inline-block"
            >
              Ir al inicio de sesión
            </a>
          </div>
        )}
      </main>
    </div>
  );
};