import  { useState, useEffect } from "react";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";

export default function App() {
  const [currentView, setCurrentView] = useState<"home" | "login">("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Revisa si hay un token guardado al recargar la página
  useEffect(() => {
    if (localStorage.getItem("access_token")) {
      setIsLoggedIn(true);
    }
  }, []);

  // Si la vista actual es "login", mostramos TU componente de login
  if (currentView === "login") {
    return (
      <div className="bg-background min-h-screen relative">
        <button
          onClick={() => setCurrentView("home")}
          className="absolute top-4 left-4 z-50 text-on-surface-variant hover:text-primary flex items-center gap-1 bg-surface/50 px-4 py-2 rounded-full border border-outline-variant/30"
        >
          <span className="material-symbols-outlined">arrow_back</span> Volver
        </button>
        <LoginPage
          onLoginSuccess={() => {
            setIsLoggedIn(true);
            setCurrentView("home"); // Al loguear con éxito, volvemos al Home
          }}
        />
      </div>
    );
  }

  // Si la vista no es login, mostramos la página principal
  return (
    <HomePage
      isLoggedIn={isLoggedIn}
      onLoginClick={() => setCurrentView("login")}
      onLogoutClick={() => {
        localStorage.removeItem("access_token");
        setIsLoggedIn(false);
      }}
    />
  );
}
