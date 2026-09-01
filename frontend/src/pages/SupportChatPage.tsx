import React, { useState } from "react";
import { ChatPanel } from "../components/chat/ChatPanel";
import { CartDrawer } from "../components/products/CartDrawer";
import { Sidebar } from "../components/layout/Sidebar";

interface SupportChatPageProps {
  isStaff?: boolean;
  isSubscribed?: boolean;
  onLogoutClick: () => void;
}

export const SupportChatPage: React.FC<SupportChatPageProps> = ({
  isStaff = false,
  isSubscribed = false,
  onLogoutClick,
}) => {
  const [cartOpen, setCartOpen] = useState(false);

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
          <ChatPanel isAdmin={isStaff} />
        </main>
      </div>

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};
