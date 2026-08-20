import React, { useState } from "react";
import { Link } from "react-router-dom";
import { userApi } from "../services/userApi"; 
import { InputField } from "../components/ui/InputField";
import { Button } from "../components/ui/Button";
import { AuthCard } from "../components/ui/AuthCard";

interface RegisterPageProps {
  onRegisterSuccess?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess }) => {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!terms) {
      setError("Debes aceptar los Términos y Condiciones.");
      return;
    }

    setLoading(true);

    try {
      await userApi.register({
        username,
        nombre: fullName,
        email,
        password,
      });

      if (onRegisterSuccess) {
        onRegisterSuccess();
      }
    } catch (err: any) {
      // Mensaje seguro y amigable para el usuario
      if (err.response && err.response.status === 400) {
        // Si Django rechaza por validación (ej. email o username duplicados)
        setError("Verifica tus datos. Es posible que el correo o el usuario ya estén registrados.");
      } else {
        setError("Ocurrió un error al registrarse. Inténtalo de nuevo más tarde.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Aether3D"
      subtitle="Join the Creator Community"
      description="Enter your details to start commissioning and selling high-fidelity 3D assets."
    >
      {error && (
        <div className="bg-error/20 border border-error text-on-error-container p-3 rounded-md text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <InputField
          id="username"
          label="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="janedoe99"
          icon="account_circle"
          required
        />

        <InputField
          id="fullName"
          label="Full Name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Doe"
          icon="person"
          required
        />

        <InputField
          id="email"
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
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
        />

        <InputField
          id="passwordConfirm"
          label="Confirm Password"
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder="••••••••"
          icon="lock_reset"
          required
          isMono
        />

        <div className="flex items-start my-2">
          <div className="flex items-center h-5">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              required
              className="w-4 h-4 rounded bg-surface border-outline-variant text-primary focus:ring-primary focus:ring-offset-background"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="terms" className="text-on-surface-variant font-body-md">
              I agree to the{" "}
              <a href="#" className="text-primary hover:underline underline-offset-4 decoration-primary/50 transition-colors">
                Terms and Conditions
              </a>
            </label>
          </div>
        </div>

        <Button type="submit" loading={loading} icon="arrow_forward" className="mt-2">
          Register
        </Button>
      </form>

      <p className="mt-6 text-center text-on-surface-variant text-sm">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-primary hover:text-primary-fixed-dim hover:underline underline-offset-4 transition-colors font-bold"
        >
          Log in
        </Link>
      </p>
    </AuthCard>
  );
};