import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate, Link } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  // Verificación de sesión al cargar/recargar
  useEffect(() => {
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
    const token = localStorage.getItem("access_token");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = () => {
    // =========================================================================
    // 🔒 NOTA SOBRE CIERRE DE SESIÓN CON COOKIES HTTP-ONLY:
    // Si usas localStorage, basta con hacer removeItem.
    // Si usas Cookies HTTP-only, deberás llamar a un endpoint del backend (ej. POST /api/auth/logout)
    // para que el servidor responda invalidando y borrando la cookie del navegador.
    // =========================================================================
    localStorage.removeItem("access_token");
    setIsLoggedIn(false);
  };

  return (
    <Routes>
      {/* Ruta Raíz: HomePage */}
      <Route 
        path="/" 
        element={
          <HomePage
            isLoggedIn={isLoggedIn}
            onLoginClick={() => {
              navigate("/login");
            }}
            onLogoutClick={handleLogout}
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
              className="absolute top-4 left-4 z-50 text-on-surface-variant hover:text-primary flex items-center gap-1 bg-surface/50 px-4 py-2 rounded-full border border-outline-variant/30 no-underline"
            >
              <span className="material-symbols-outlined">arrow_back</span> Volver
            </Link>
            
            <LoginPage
              onLoginSuccess={() => {
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
                navigate("/");
              }}
            />
          </div>
        } 
      />

    
    </Routes>
  );
}