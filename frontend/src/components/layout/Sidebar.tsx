import React from "react";
import { NavLink, Link } from "react-router-dom";

interface SidebarProps {
  isStaff: boolean;
  hasAccess: boolean; // <-- 1. Recibe la variable de acceso
  activeView: "catalogo" | "chat"; // <-- 2. Recibe la vista actual
  onSelectView: (view: "catalogo" | "chat") => void; // <-- 3. Recibe el disparador para cambiar de vista
  onLogout: () => void;
}

const linkBase =
  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all border-l-4 cursor-pointer w-full";

const linkClass = (active: boolean) =>
  active
    ? `${linkBase} text-primary bg-primary/10 border-primary font-semibold`
    : `${linkBase} text-on-surface-variant hover:text-on-surface hover:bg-primary-container/10 border-transparent`;

export const Sidebar: React.FC<SidebarProps> = ({ 
  isStaff, 
  hasAccess, 
  activeView, 
  onSelectView, 
  onLogout 
}) => {
  return (
    <aside className="hidden md:flex flex-col pt-8 pb-6 bg-surface-container-low/80 backdrop-blur-2xl fixed left-0 top-0 h-screen w-64 z-40 border-r border-outline-variant/30">
      {/* Logo */}
      <div className="px-6 mb-8">
        <Link to="/" onClick={() => onSelectView("catalogo")} className="flex items-center gap-2 no-underline">
          <span className="material-symbols-outlined text-primary text-[28px]">architecture</span>
          <span className="font-bold text-xl tracking-tighter text-primary">MimiMMDart</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <button 
          onClick={() => onSelectView("catalogo")} 
          className={linkClass(activeView === "catalogo")}
        >
          <span className="material-symbols-outlined text-[20px]">storefront</span>
          Inicio
        </button>

        <NavLink to="/biblioteca" className={({ isActive }) => linkClass(isActive)}>
          <span className="material-symbols-outlined text-[20px]">inventory_2</span>
          Mi Biblioteca
        </NavLink>

        {/* El chat solo se muestra si el usuario tiene suscripción activa o es staff */}
        {hasAccess && (
          <button 
            onClick={() => onSelectView("chat")} 
            className={linkClass(activeView === "chat")}
          >
            <span className="material-symbols-outlined text-[20px]">chat</span>
            Chat de Soporte
          </button>
        )}

        {isStaff && (
          <NavLink to="/admin" className={({ isActive }) => linkClass(isActive)}>
            <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
            Panel Admin
          </NavLink>
        )}
      </nav>

      <div className="px-3 mt-auto">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors text-left"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};