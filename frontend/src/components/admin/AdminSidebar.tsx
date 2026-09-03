import React, { useState } from "react";
import { Link } from "react-router-dom";

export type AdminView = "catalogo" | "chat" | "comisiones" | "ajustes";

interface AdminSidebarProps {
  activeView: AdminView;
  onSelectView: (view: AdminView) => void;
  onLogout: () => void;
}

const navItems: { view: AdminView; label: string; icon: string }[] = [
  { view: "catalogo", label: "Catálogo", icon: "inventory_2" },
  { view: "chat", label: "Conversaciones", icon: "chat" },
  { view: "comisiones", label: "Comisiones", icon: "design_services" },
  { view: "ajustes", label: "Ajustes", icon: "settings" },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeView,
  onSelectView,
  onLogout,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  const navLinks = (
    <nav className="flex-1 px-3 space-y-1">
      {navItems.map((item) => {
        const active = activeView === item.view;
        return (
          <button
            key={item.view}
            onClick={() => {
              onSelectView(item.view);
              closeMobile();
            }}
            className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
              active
                ? "text-primary bg-primary/10 border-l-4 border-primary font-semibold"
                : "text-on-surface-variant hover:text-on-surface hover:bg-primary-container/10 border-l-4 border-transparent"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  const footerLinks = (
    <div className="px-3 mt-auto flex flex-col gap-1">
      <Link
        to="/"
        onClick={closeMobile}
        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-primary-container/10 transition-colors no-underline"
      >
        <span className="material-symbols-outlined text-[20px]">storefront</span>
        Volver a la tienda
      </Link>
      <button
        onClick={onLogout}
        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-on-surface-variant hover:text-error transition-colors text-left"
      >
        <span className="material-symbols-outlined text-[20px]">logout</span>
        Cerrar sesión
      </button>
    </div>
  );

  return (
    <>
      {/* Botón de menú, solo visible en móvil */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
        className="md:hidden fixed top-4 left-4 z-60 w-10 h-10 rounded-full bg-surface-container-low/90 backdrop-blur border border-outline-variant/30 flex items-center justify-center text-on-surface shadow-md"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      {/* Sidebar de escritorio */}
      <aside className="hidden md:flex flex-col pt-8 pb-6 bg-surface-container-low/80 backdrop-blur-2xl fixed left-0 top-0 h-screen w-64 z-40 border-r border-outline-variant/30">
        <div className="px-6 mb-8">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <span className="material-symbols-outlined text-primary text-[28px]">architecture</span>
            <span className="font-bold text-lg tracking-tighter text-primary leading-tight">
              MimiMMDart
              <span className="block text-xs font-semibold text-on-surface-variant tracking-widest uppercase">
                Admin
              </span>
            </span>
          </Link>
        </div>
        {navLinks}
        {footerLinks}
      </aside>

      {/* Menú móvil: overlay + panel que se desliza desde la derecha */}
      <div
        className={`md:hidden fixed inset-0 z-110 transition-opacity duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={closeMobile} />

        <aside
          className={`absolute right-0 top-0 h-full w-72 max-w-[80vw] bg-surface-container-low/95 backdrop-blur-2xl border-l border-outline-variant/30 shadow-2xl flex flex-col pt-6 pb-6 transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-6 mb-8">
            <Link to="/" className="flex items-center gap-2 no-underline" onClick={closeMobile}>
              <span className="material-symbols-outlined text-primary text-[28px]">architecture</span>
              <span className="font-bold text-lg tracking-tighter text-primary leading-tight">
                MimiMMDart
                <span className="block text-xs font-semibold text-on-surface-variant tracking-widest uppercase">
                  Admin
                </span>
              </span>
            </Link>
            <button
              onClick={closeMobile}
              aria-label="Cerrar menú"
              className="text-on-surface-variant hover:text-primary transition-colors w-9 h-9 rounded-full hover:bg-surface-variant/50 flex items-center justify-center shrink-0"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          {navLinks}
          {footerLinks}
        </aside>
      </div>
    </>
  );
};
