import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { PieDePagina } from "./PieDePagina";

interface GuestLayoutProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  // Clases extra para <main>, igual que en AppLayout.
  mainClassName?: string;
  children: React.ReactNode;
}

// Layout de la portada para visitantes sin sesión: barra con el logo y los
// botones de entrar/registrarse (menú desplegable en móvil), contenido y
// pie. Es el equivalente público de AppLayout — sin menú lateral ni carrito,
// porque un visitante no tiene secciones propias.
export const GuestLayout: React.FC<GuestLayoutProps> = ({
  onLoginClick,
  onRegisterClick,
  mainClassName = "",
  children,
}) => {
  const { t } = useTranslation();
  const [guestMenuOpen, setGuestMenuOpen] = useState(false);

  return (
    <div className="bg-background text-on-surface font-sans min-h-screen flex">
      <div className="flex-1 flex flex-col min-w-0">
        {/* BARRA SUPERIOR */}
        <header className="fixed top-0 right-0 left-0 z-50 bg-surface/70 backdrop-blur-xl border-b border-outline-variant/30 transition-all duration-300">
          <div className="flex justify-between items-center gap-4 pl-gutter pr-gutter md:px-gutter max-w-container-max mx-auto h-20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-[32px]">
                architecture
              </span>
              <span className="font-bold text-[24px] tracking-tighter text-primary">
                {t("common.appName")}
              </span>
            </div>

            {/* Escritorio: botones directos */}
            <div className="hidden md:flex items-center gap-4">
              <LanguageSwitcher />
              <button
                onClick={onLoginClick}
                className="text-on-surface-variant hover:text-primary transition-colors px-4 py-2"
              >
                {t("home.login")}
              </button>
              <button
                onClick={onRegisterClick}
                className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded px-6 py-2 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95"
              >
                {t("home.register")}
              </button>
            </div>

            {/* Móvil: hamburguesa */}
            <button
              onClick={() => setGuestMenuOpen(true)}
              aria-label={t("home.menu")}
              className="md:hidden w-10 h-10 rounded-full bg-surface-container-low/90 border border-outline-variant/30 flex items-center justify-center text-on-surface"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </header>

        {/* Menú móvil de invitado (mismo estilo que el drawer del Sidebar logueado) */}
        <div
          className={`md:hidden fixed inset-0 z-110 transition-opacity duration-300 ${
            guestMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setGuestMenuOpen(false)}
          />
          <aside
            className={`absolute right-0 top-0 h-full w-72 max-w-[80vw] bg-surface-container-low/95 backdrop-blur-2xl border-l border-outline-variant/30 shadow-2xl flex flex-col pt-6 pb-6 px-3 transition-transform duration-300 ease-out ${
              guestMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between px-3 mb-8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[28px]">
                  architecture
                </span>
                <span className="font-bold text-xl tracking-tighter text-primary">
                  {t("common.appName")}
                </span>
              </div>
              <button
                onClick={() => setGuestMenuOpen(false)}
                aria-label={t("home.closeMenu")}
                className="text-on-surface-variant hover:text-primary transition-colors w-9 h-9 rounded-full hover:bg-surface-variant/50 flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="px-3 mb-6">
              <LanguageSwitcher />
            </div>

            <div className="flex flex-col gap-2 px-3">
              <button
                onClick={() => {
                  setGuestMenuOpen(false);
                  onLoginClick();
                }}
                className="w-full text-left px-4 py-2.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-primary-container/10 transition-colors"
              >
                {t("home.login")}
              </button>
              <button
                onClick={() => {
                  setGuestMenuOpen(false);
                  onRegisterClick();
                }}
                className="w-full bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg px-4 py-2.5 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95"
              >
                {t("home.register")}
              </button>
            </div>
          </aside>
        </div>

        <main className={`flex-grow pt-24 pb-16 px-gutter md:px-16 max-w-container-max mx-auto w-full ${mainClassName}`}>
          {children}
        </main>

        <PieDePagina />
      </div>
    </div>
  );
};
