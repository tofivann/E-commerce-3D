import { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate, Link } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { AdminPage } from "./pages/AdminPage";
import { RegisterPage } from "./pages/RegisterPage";
import { LibraryPage } from "./pages/LibraryPage";
import { SupportChatPage } from "./pages/SupportChatPage";
import { CommissionsPage } from "./pages/CommissionsPage";
import { PaymentSuccessPage } from "./pages/PaymentSuccessPage";
import { ActivationSuccessPage } from "./pages/ActivationSuccessPage";
import { RegisterSuccessPage } from "./pages/RegisterSuccessPage";
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { LegalPage } from './pages/LegalPage';
import { authApi } from './services/authApi';

/**
 * Componente principal App que configura las rutas de la aplicación.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

/**
 * Componente interno de rutas para poder utilizar los hooks de React Router
 * (como useNavigate) de forma limpia y directa.
 */
function AppRoutes() {
  // =========================================================================
  // 🔒 NOTA SOBRE PERSISTENCIA Y COOKIES HTTP-ONLY:
  // Si migras a Cookies HTTP-only, este 'localStorage.getItem("access_token")' ya no funcionará
  // en el frontend porque JavaScript no tiene acceso a cookies HTTP-only por seguridad.
  //
  // En su lugar, el flujo correcto para saber si el usuario está logueado en el frontend será:
  // - Hacer una petición ligera al backend (ej. GET /api/auth/me) al cargar la app.
  // - Si el backend responde con los datos del usuario (porque la cookie viajó sola),
  //   entonces 'setIsLoggedIn(true)'. Si responde 401 Unauthorized, el usuario no está logueado.
  // =========================================================================
  // Se leen de forma perezosa (en el estado inicial, no en un efecto) para que las rutas
  // protegidas (/admin, /biblioteca) vean el estado real de sesión desde el primer render:
  // si se inicializaran en `false` y se corrigieran luego en un useEffect, un <Navigate>
  // en esas rutas redirigiría al usuario a "/" antes de que el efecto llegara a ejecutarse
  // (por ejemplo, al recargar la página estando ya logueado).
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => Boolean(localStorage.getItem("access_token"))
  );
  const [isStaff, setIsStaff] = useState(
    () => localStorage.getItem("is_staff") === "true"
  );
  const [isSubscribed, setIsSubscribed] = useState(
    () => localStorage.getItem("estado_suscripcion") === "ACTIVO"
  );
  const navigate = useNavigate();

  const handleLogout = () => {
    // Se invalida el refresh token en el servidor (lista negra) además de
    // borrarlo del navegador; si no, seguiría sirviendo para renovar la
    // sesión hasta 7 días. Es "best effort": si la llamada falla (sin red),
    // la sesión local se cierra igual.
    //
    // 🔒 NOTA SOBRE CIERRE DE SESIÓN CON COOKIES HTTP-ONLY: con cookies, ese
    // mismo endpoint sería además el que borre la cookie en la respuesta.
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      authApi.logout(refreshToken).catch((err) => console.error("Error al cerrar sesión en el servidor:", err));
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("is_staff");
    localStorage.removeItem("estado_suscripcion");
    setIsLoggedIn(false);
    setIsStaff(false);
    setIsSubscribed(false);
    navigate("/");
  };

  return (
    <Routes>
      {/* Ruta Raíz: HomePage */}
      <Route 
        path="/" 
        element={
          <HomePage
            isLoggedIn={isLoggedIn}
            isStaff={isStaff}
            isSubscribed={isSubscribed}
            onLoginClick={() => {
              navigate("/login");
            }}
            onLogoutClick={handleLogout}
            onRegisterClick={() => navigate("/register")}
          />
        } 
      />

      {/* Ruta de Login con su contenedor visual y botón de volver */}
      <Route 
        path="/login" 
        element={
          <div className="bg-background min-h-screen relative">
            <Link
              to="/"
              className="fixed top-4 left-4 z-50 text-on-surface-variant hover:text-primary flex items-center gap-1 bg-surface/50 px-4 py-2 rounded-full border border-outline-variant/30 no-underline"
            >
              <span className="material-symbols-outlined">arrow_back</span> Volver
            </Link>
            
            <LoginPage
              onLoginSuccess={(isStaffUser, estadoSuscripcion) => {
                // =========================================================================
                // 🔒 NOTA DE SEGURIDAD (MEJORA PARA PRODUCCIÓN - HTTP-ONLY COOKIES):
                // Actualmente el token se guarda en 'localStorage' (ej. localStorage.setItem("access_token", token)).
                // Riesgo: Cualquier script XSS malicioso en el navegador puede leer el localStorage y robar el token.
                //
                // Plan de mejora ideal:
                // 1. El backend debe configurar el token directamente en una Cookie HTTP-only y Secure
                //    durante la respuesta del endpoint de login (Set-Cookie).
                // 2. Al ser HTTP-only, JavaScript del lado del cliente (Frontend) NO puede leerla, protegiéndola contra XSS.
                // 3. El navegador enviará la cookie automáticamente en cada petición HTTP al backend sin que tengas
                //    que gestionarla manualmente aquí.
                // =========================================================================
                setIsLoggedIn(true);
                setIsStaff(isStaffUser);
                setIsSubscribed(estadoSuscripcion === "ACTIVO");
                navigate(isStaffUser ? "/admin" : "/");
              }}
            />
          </div>
        }
      />

      {/* Ruta de Administración: solo accesible para usuarios con is_staff */}
      <Route
        path="/admin"
        element={
          isLoggedIn && isStaff ? (
            <AdminPage onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      {/* Ruta de Biblioteca Digital: solo accesible con sesión iniciada */}
      <Route
        path="/biblioteca"
        element={
          isLoggedIn ? (
            <LibraryPage isStaff={isStaff} isSubscribed={isSubscribed} onLogoutClick={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      {/* Ruta de Chat de Soporte: admins o suscriptores con cuenta activa */}
      <Route
        path="/soporte"
        element={
          isLoggedIn && (isStaff || isSubscribed) ? (
            <SupportChatPage isStaff={isStaff} isSubscribed={isSubscribed} onLogoutClick={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      {/* Ruta de Comisiones (Motion / Modelo Nuevo): solo accesible con sesión iniciada */}
      <Route
        path="/comisiones"
        element={
          isLoggedIn ? (
            <CommissionsPage isStaff={isStaff} isSubscribed={isSubscribed} onLogoutClick={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      {/* Ruta de retorno de Stripe Checkout tras completar el pago */}
      <Route
        path="/pago-completado"
        element={
          isLoggedIn ? (
            <PaymentSuccessPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      {/*  Ruta de éxito de activación de cuenta (Suscripción) */}
      <Route
        path="/activacion-exitosa"
        element={
          isLoggedIn ? (
            <ActivationSuccessPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      {/* Ruta de Registro */}
      <Route 
        path="/register" 
        element={
          <div className="bg-background min-h-screen relative">
            <Link
              to="/"
              className="fixed top-4 left-4 z-50 text-on-surface-variant hover:text-primary flex items-center gap-1 bg-surface/50 px-4 py-2 rounded-full border border-outline-variant/30 no-underline"
            >
              <span className="material-symbols-outlined">arrow_back</span> Volver
            </Link>
            
            <RegisterPage/>
          </div>
        } 
      />

    <Route 
        path="/registro-exitoso" 
        element={<RegisterSuccessPage />} 
      />

      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route path="/privacidad" element={<LegalPage documento="privacidad" />} />
      <Route path="/terminos" element={<LegalPage documento="terminos" />} />
    </Routes>
  );
}