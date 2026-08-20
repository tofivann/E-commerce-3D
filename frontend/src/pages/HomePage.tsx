import React from "react";
import { Link } from "react-router-dom";
import { ProductList } from "../components/products/ProductList";
import heroImage from "../assets/hero1.webp";

interface HomePageProps {
  isLoggedIn: boolean;
  isStaff?: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onRegisterClick: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  isLoggedIn,
  isStaff = false,
  onLoginClick,
  onLogoutClick,
  onRegisterClick,
}) => {
  return (
    <div className="bg-background text-on-surface font-sans min-h-screen flex flex-col">
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl border-b border-outline-variant/30 transition-all duration-300">
        <div className="flex justify-between items-center px-gutter max-w-container-max mx-auto h-20">
          <div className="flex items-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined text-primary-container text-[32px]">
              architecture
            </span>
            <span className="font-bold text-[24px] tracking-tighter text-primary">
              MimiMMDart
            </span>
          </div>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <>
                {isStaff && (
                  <Link
                    to="/admin"
                    className="text-on-surface-variant hover:text-primary transition-colors px-4 py-2 flex items-center gap-1 no-underline"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      admin_panel_settings
                    </span>
                    Panel Admin
                  </Link>
                )}
                <button
                  onClick={onLogoutClick}
                  className="text-error hover:text-on-error-container font-semibold px-4 py-2"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onLoginClick}
                  className="text-on-surface-variant hover:text-primary transition-colors px-4 py-2"
                >
                  Iniciar Sesión
                </button>
                <button
                onClick={onRegisterClick}
                 className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded px-6 py-2 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95">
                  Registrarse
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-grow pt-24 pb-16 px-gutter md:px-16 max-w-container-max mx-auto w-full flex flex-col gap-16">
        {/* Banner Hero (solo si no ha iniciado sesión) */}
        {!isLoggedIn && (
          <section className="relative w-full rounded-xl overflow-hidden glass-panel min-h-100 flex items-end justify-center text-center mt-8">
            <img
              src={heroImage}
              alt="MimiMMDart — comisiona modelos 3D pulidos y listos para MikuMikuDance"
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent"></div>
            <div className="relative z-10 flex flex-col items-center gap-4 max-w-xl p-8">
              <button
                onClick={onRegisterClick}
                className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded px-8 py-3 text-lg font-bold hover:bg-primary-fixed-dim transition-all active:scale-95 shadow-[0_4px_18px_rgba(232,137,174,0.45)]"
              >
                Crear Cuenta Ahora
              </button>
            </div>
          </section>
        )}

        {/* Lista de productos */}
        <div className={isLoggedIn ? "mt-8" : "mt-0"}>
          <ProductList isLoggedIn={isLoggedIn} />
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-background w-full py-16 border-t border-outline-variant/20 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-gutter max-w-container-max mx-auto gap-4">
          <div className="text-[24px] font-bold text-primary opacity-50">
            MimiMMDart
          </div>
          <div className="text-on-surface-variant text-sm">
            © 2026 MimiMMDart.
          </div>
        </div>
      </footer>
    </div>
  );
};
