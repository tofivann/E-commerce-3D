import React from "react";
import { ProductList } from "../components/products/ProductList";

interface HomePageProps {
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  isLoggedIn,
  onLoginClick,
  onLogoutClick,
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
              MMD3D
            </span>
          </div>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <button
                onClick={onLogoutClick}
                className="text-error hover:text-on-error-container font-semibold px-4 py-2"
              >
                Cerrar Sesión
              </button>
            ) : (
              <>
                <button
                  onClick={onLoginClick}
                  className="text-on-surface-variant hover:text-primary transition-colors px-4 py-2"
                >
                  Iniciar Sesión
                </button>
                <button className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded px-6 py-2 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95">
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
          <section className="relative w-full rounded-xl overflow-hidden glass-panel min-h-[400px] flex items-center justify-center text-center p-10 mt-8">
            <div className="absolute inset-0 z-0 opacity-25">
              <div
                className="bg-cover bg-center w-full h-full"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80')",
                }}
              ></div>
            </div>
            <div className="absolute inset-0 z-0 bg-background/50"></div>
            <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl">
              <h1 className="text-3xl md:text-5xl text-on-surface font-bold text-balance leading-tight drop-shadow-sm">
                Descubre el Futuro del Arte Digital en 3D
              </h1>
              <p className="text-lg text-on-surface-variant max-w-xl text-balance">
                Únete a la plataforma líder para creadores. Explora miles de
                modelos de alta fidelidad, texturas y entornos listos para tu
                próximo gran proyecto.
              </p>
              <button
                onClick={onLoginClick}
                className="mt-4 bg-primary-container text-on-primary-fixed btn-glow-inner rounded px-8 py-3 text-lg font-bold hover:bg-primary-fixed-dim transition-all active:scale-95 shadow-[0_4px_18px_rgba(232,137,174,0.45)]"
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
            Aether3D
          </div>
          <div className="text-on-surface-variant text-sm">
            © 2026 MMD3D Digital Arts.
          </div>
        </div>
      </footer>
    </div>
  );
};
