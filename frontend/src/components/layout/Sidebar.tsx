import React, { useState } from "react";
import { NavLink } from "react-router-dom";

interface SidebarProps {
  isStaff: boolean;
  hasAccess: boolean; // admin o suscriptor activo: desbloquea el chat de soporte
  onLogout: () => void;
}

const linkBase =
  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all border-l-4 w-full no-underline";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? `${linkBase} text-primary bg-primary/10 border-primary font-semibold`
    : `${linkBase} text-on-surface-variant hover:text-on-surface hover:bg-primary-container/10 border-transparent`;

export const Sidebar: React.FC<SidebarProps> = ({ isStaff, hasAccess, onLogout }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  const navLinks = (
    <nav className="flex-1 px-3 space-y-1">
      <NavLink to="/" end className={linkClass} onClick={closeMobile}>
        <span className="material-symbols-outlined text-[20px]">storefront</span>
        Inicio
      </NavLink>

      <NavLink to="/biblioteca" className={linkClass} onClick={closeMobile}>
        <span className="material-symbols-outlined text-[20px]">inventory_2</span>
        Mi Biblioteca
      </NavLink>

      <NavLink to="/comisiones" className={linkClass} onClick={closeMobile}>
        <span className="material-symbols-outlined text-[20px]">design_services</span>
        Comisiones
      </NavLink>

      {/* El chat solo se muestra si el usuario tiene suscripción activa o es staff */}
      {hasAccess && (
        <NavLink to="/soporte" className={linkClass} onClick={closeMobile}>
          <span className="material-symbols-outlined text-[20px]">chat</span>
          Chat de Soporte
        </NavLink>
      )}

      {isStaff && (
        <NavLink to="/admin" className={linkClass} onClick={closeMobile}>
          <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
          Panel Admin
        </NavLink>
      )}
    </nav>
  );

  const logoutButton = (
    <div className="px-3 mt-auto">
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors text-left"
      >
        <span className="material-symbols-outlined text-[20px]">logout</span>
        Cerrar Sesión
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
          <NavLink to="/" end className="flex items-center gap-2 no-underline">
            <span className="material-symbols-outlined text-primary text-[28px]">architecture</span>
            <span className="font-bold text-xl tracking-tighter text-primary">MimiMMDart</span>
          </NavLink>
        </div>
        {navLinks}
        {logoutButton}
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
            <NavLink to="/" end className="flex items-center gap-2 no-underline" onClick={closeMobile}>
              <span className="material-symbols-outlined text-primary text-[28px]">architecture</span>
              <span className="font-bold text-xl tracking-tighter text-primary">MimiMMDart</span>
            </NavLink>
            <button
              onClick={closeMobile}
              aria-label="Cerrar menú"
              className="text-on-surface-variant hover:text-primary transition-colors w-9 h-9 rounded-full hover:bg-surface-variant/50 flex items-center justify-center"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          {navLinks}
          {logoutButton}
        </aside>
      </div>
    </>
  );
};
