import React, { useState } from "react";
import { DigitalLibrary } from "../components/products/DigitalLibrary";
import { ComisionesLibrary } from "../components/comisiones/ComisionesLibrary";
import { CartDrawer } from "../components/products/CartDrawer";
import { Sidebar } from "../components/layout/Sidebar";

interface LibraryPageProps {
  isStaff?: boolean;
  isSubscribed?: boolean;
  onLogoutClick: () => void;
}

type PestanaBiblioteca = "productos" | "comisiones";

export const LibraryPage: React.FC<LibraryPageProps> = ({
  isStaff = false,
  isSubscribed = false,
  onLogoutClick,
}) => {
  const [cartOpen, setCartOpen] = useState(false);
  const [pestana, setPestana] = useState<PestanaBiblioteca>("productos");

  // Misma regla de acceso que en HomePage: admins o suscriptores activos.
  const hasAccess = isStaff || isSubscribed;

  return (
    <div className="bg-background text-on-surface font-sans min-h-screen flex">
      <Sidebar isStaff={isStaff} hasAccess={hasAccess} onLogout={onLogoutClick} />

      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        {/* BARRA SUPERIOR */}
        <header className="fixed top-0 right-0 left-0 md:left-64 z-50 bg-surface/70 backdrop-blur-xl border-b border-outline-variant/30 transition-all duration-300">
          <div className="flex justify-end items-center px-gutter max-w-container-max mx-auto h-20">
            <button
              onClick={() => setCartOpen(true)}
              aria-label="Carrito"
              className="text-on-surface-variant hover:text-primary transition-colors p-2"
            >
              <span className="material-symbols-outlined">shopping_cart</span>
            </button>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-grow pt-24 pb-16 px-gutter md:px-16 max-w-container-max mx-auto w-full">
          <div className="inline-flex items-center gap-1 p-1 mb-6 rounded-lg bg-surface-container-high/60 border border-outline-variant/30">
            <button
              onClick={() => setPestana("productos")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${
                pestana === "productos"
                  ? "bg-primary-container text-on-primary-fixed"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              Productos
            </button>
            <button
              onClick={() => setPestana("comisiones")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${
                pestana === "comisiones"
                  ? "bg-primary-container text-on-primary-fixed"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">design_services</span>
              Comisiones Personalizadas
            </button>
          </div>

          {pestana === "productos" ? <DigitalLibrary /> : <ComisionesLibrary />}
        </main>

        {/* FOOTER */}
        <footer className="bg-background w-full py-16 border-t border-outline-variant/20 mt-auto">
          <div className="flex flex-col md:flex-row justify-between items-center px-gutter max-w-container-max mx-auto gap-4">
            <div className="text-[24px] font-bold text-primary opacity-50">MimiMMDart</div>
            <div className="text-on-surface-variant text-sm">© 2026 MimiMMDart.</div>
          </div>
        </footer>
      </div>

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};
