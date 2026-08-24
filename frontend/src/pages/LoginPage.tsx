import React, { useState } from "react";
import { authApi } from "../services/authApi";
import { InputField } from "../components/ui/InputField";
import { Button } from "../components/ui/Button";
import { AuthCard } from "../components/ui/AuthCard";

// 1. AGREGAMOS ESTO: Le decimos a TypeScript que este componente acepta una función llamada "onLoginSuccess"
interface LoginPageProps {
  onLoginSuccess?: (isStaff: boolean, estadoSuscripcion: string) => void;
}

// 2. MODIFICAMOS ESTA LÍNEA: Agregamos <LoginPageProps> y recibimos { onLoginSuccess }
export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    //REVISARRR ESTO IVAN PARA EL INICIO DE SESION-------------------------------------

    try {
      // Intentamos loguear con el backend
      const data = await authApi.login({ email, password });

      // Guardamos tokens en localStorage
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);

      const isStaff = Boolean(data.user?.is_staff);
      const estadoSuscripcion = data.user?.estado_suscripcion || "INACTIVO";
      localStorage.setItem("is_staff", String(isStaff));
      localStorage.setItem("estado_suscripcion", estadoSuscripcion);

      // 3. AGREGAMOS ESTO: Si el login es exitoso, ejecutamos la función que nos mandó App.tsx
      if (onLoginSuccess) {
        onLoginSuccess(isStaff, estadoSuscripcion);
      }
    } catch (err: any) {
      setError("El correo electrónico o la contraseña son incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  //REVISARRR ESTO IVAN PARA EL INICIO DE SESION-------------------------------------

  return (
    <AuthCard
      title="MimiMMDart"
      subtitle="Welcome Back"
      description="Enter your credentials to access the marketplace."
    >
      {error && (
        <div className="bg-error/20 border border-error text-on-error-container p-3 rounded-md text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-6">
        <InputField
          id="email"
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="usuario@gmail.com"
          icon="mail"
          required
        />

        <InputField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          icon="lock"
          required
          isMono
          extraRightContent={
            <a
              className="text-xs font-mono text-primary hover:text-primary-fixed transition-colors"
              href="#"
            >
              Forgot Password?
            </a>
          }
        />

        <Button type="submit" loading={loading} icon="login" className="mt-2">
          Login
        </Button>
      </form>

      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-outline-variant/50"></div>
        <span className="flex-shrink-0 mx-4 text-on-surface-variant font-mono text-xs">
          OR CONTINUE WITH
        </span>
        <div className="flex-grow border-t border-outline-variant/50"></div>
      </div>

      <div className="flex gap-4">
        <Button variant="outline" type="button">
          <span className="material-symbols-outlined text-on-surface-variant">
            account_circle
          </span>
          Google
        </Button>
        <Button variant="outline" type="button">
          <span className="material-symbols-outlined text-secondary">
            forum
          </span>
          Discord
        </Button>
      </div>
    </AuthCard>
  );
};
