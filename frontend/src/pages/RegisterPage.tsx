import React, { useState } from "react";
import { Link } from "react-router-dom";
import { userApi } from "../services/userApi";
import { InputField } from "../components/ui/InputField";
import { Button } from "../components/ui/Button";

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
      if (err.response && err.response.status === 400) {
        setError("Verifica tus datos. Es posible que el correo o el usuario ya estén registrados.");
      } else {
        setError("Ocurrió un error al registrarse. Inténtalo de nuevo más tarde.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex items-center justify-center p-4 md:p-8 w-full">
      {/* Contenedor principal general */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Columna Izquierda: Bloque de marca alineado hacia abajo (justify-end) */}
        <div className="hidden md:flex md:col-span-5 flex-col justify-end min-h-[450px] px-4 pb-4">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-primary tracking-tight mb-3 drop-shadow-lg font-display-lg">
            MimiMMDart
          </h2>
          <p className="text-lg lg:text-xl font-semibold text-on-surface-variant drop-shadow-md">
            Join the Creator Community.
          </p>
          <div className="mt-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              architecture
            </span>
            <span className="text-xs font-mono tracking-widest uppercase text-primary-fixed-dim border border-primary-fixed-dim/30 px-3 py-1 rounded-full bg-primary-fixed-dim/10">
              Next-Gen Marketplace
            </span>
          </div>
        </div>

        {/* Columna Derecha: Tarjeta de Contenedor exclusiva para el formulario de Registro */}
        <div className="col-span-1 md:col-span-7 glass-panel rounded-2xl p-6 md:p-8 lg:p-10 shadow-2xl border border-outline-variant/20 bg-surface-container-low/60">
          
          {/* Mobile Brand (Visible only on mobile) */}
          <div className="md:hidden mb-6 text-center">
            <h2 className="text-3xl font-bold text-primary tracking-tight">MimiMMDart</h2>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-1 tracking-tight">
              Create Account
            </h1>
            <p className="text-sm md:text-base text-on-surface-variant">
              Enter your details to start commissioning and selling high-fidelity 3D assets.
            </p>
          </div>

          {/* Mensaje de error amigable */}
          {error && (
            <div className="bg-error/20 border border-error text-on-error-container p-3 rounded-md text-sm text-center mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="flex flex-col gap-3">
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

            {/* Terms Checkbox */}
            <div className="flex items-start my-2">
              <div className="flex items-center h-5">
                <input 
                  className="w-4 h-4 rounded bg-surface border-outline-variant text-primary focus:ring-primary focus:ring-offset-background cursor-pointer" 
                  id="terms" 
                  name="terms" 
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  required 
                />
              </div>
              <div className="ml-3 text-sm">
                <label className="text-on-surface-variant cursor-pointer" htmlFor="terms">
                  I agree to the <a className="text-primary hover:underline underline-offset-4 decoration-primary/50 transition-colors font-medium" href="#">Terms and Conditions</a>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <Button type="submit" loading={loading} icon="arrow_forward" className="w-full">
              Register
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-on-surface-variant">
            Already have an account? <Link className="text-primary hover:text-primary-fixed-dim hover:underline underline-offset-4 transition-colors font-bold ml-1" to="/login">Log in</Link>
          </p>

        </div>
      </div>
    </div>
  );
};