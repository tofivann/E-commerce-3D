import React from "react";
import { Link } from "react-router-dom";

export type AdminView = "catalogo" | "chat" | "ajustes";

interface AdminSidebarProps {
  activeView: AdminView;
  onSelectView: (view: AdminView) => void;
  onLogout: () => void;
}

const navItems: { view: AdminView; label: string; icon: string }[] = [
  { view: "catalogo", label: "Catálogo", icon: "inventory_2" },
  { view: "chat", label: "Conversaciones", icon: "chat" },
  { view: "ajustes", label: "Ajustes", icon: "settings" },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeView,
  onSelectView,
  onLogout,
}) => {
  return (
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

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onSelectView(item.view)}
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

      <div className="px-3 mt-auto flex flex-col gap-1">
        <Link
          to="/"
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
    </aside>
  );
};