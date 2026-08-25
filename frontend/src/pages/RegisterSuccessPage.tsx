import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export const RegisterSuccessPage: React.FC = () => {
  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex items-center justify-center p-4 w-full">
      <div className="w-full max-w-md glass-panel rounded-2xl p-8 shadow-2xl border border-outline-variant/20 bg-surface-container-low/60 text-center">
        
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
        
      </div>
    </div>
  );
};