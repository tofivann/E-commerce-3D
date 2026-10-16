import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconoConejo } from "../ui/IconosKit";

export type AdminView = "catalogo" | "chat" | "comisiones" | "novedades" | "estadisticas" | "ajustes";

// Mismo estilo de enlace que el menú de la tienda (Sidebar): pastilla con
// borde, rosa con barra a la izquierda cuando está activa.
const linkBase =
  "w-full text-left flex items-center gap-3 min-h-[52px] px-3 py-2.5 my-1 rounded-lg border transition-colors no-underline text-[14px] font-semibold";
const linkActivo = `${linkBase} text-[#b72e61] bg-linear-to-r from-[#f4bbce] to-[#f2c6cf] border-[#df93ad] shadow-[inset_4px_0_#dc4a7c,0_3px_10px_#bd6c8417]`;
const linkInactivo = `${linkBase} text-[#484469] border-transparent hover:bg-[#efd0c5]`;

interface AdminSidebarProps {
  activeView: AdminView;
  onSelectView: (view: AdminView) => void;
  onLogout: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeView,
  onSelectView,
  onLogout,
}) => {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  const navItems: { view: AdminView; label: string; icon: string }[] = [
    { view: "catalogo", label: t("adminSidebar.catalog"), icon: "inventory_2" },
    { view: "chat", label: t("adminSidebar.conversations"), icon: "chat" },
    { view: "comisiones", label: t("adminSidebar.commissions"), icon: "design_services" },
    { view: "novedades", label: t("adminSidebar.posts"), icon: "newspaper" },
    { view: "estadisticas", label: t("adminSidebar.statistics"), icon: "monitoring" },
    { view: "ajustes", label: t("adminSidebar.settings"), icon: "settings" },
  ];

  // Marca como en la tienda, con "Admin" en vez del lema.
  const marca = (
    <Link to="/" className="flex items-center gap-2 no-underline" onClick={closeMobile}>
      <IconoConejo className="w-[34px] h-[42px] text-vino shrink-0" />
      <span className="flex flex-col leading-tight">
        <span className="text-[22px] font-extrabold tracking-[-1px] text-vino">{t("common.appName")}</span>
        <small className="text-[9px] font-medium tracking-[2px] uppercase text-malva mt-1">Admin</small>
      </span>
    </Link>
  );

  const navLinks = (
    <nav className="flex-1">
      {navItems.map((item) => (
        <button
          key={item.view}
          onClick={() => {
            onSelectView(item.view);
            closeMobile();
          }}
          className={activeView === item.view ? linkActivo : linkInactivo}
        >
          <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );

  const footerLinks = (
    <div className="mt-auto flex flex-col">
      <Link to="/" onClick={closeMobile} className={linkInactivo}>
        <span className="material-symbols-outlined text-[20px]">storefront</span>
        {t("adminSidebar.backToShop")}
      </Link>
      <button onClick={onLogout} className={`${linkInactivo} hover:text-error hover:bg-error/10`}>
        <span className="material-symbols-outlined text-[20px]">logout</span>
        {t("adminSidebar.logout")}
      </button>
    </div>
  );

  return (
    <>
      {/* Botón de menú, solo visible en móvil */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label={t("home.menu")}
        className="md:hidden fixed top-4 left-4 z-60 w-10 h-10 rounded-full bg-surface-container-low/90 backdrop-blur border border-outline-variant/30 flex items-center justify-center text-on-surface shadow-md"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      {/* Sidebar de escritorio */}
      <aside className="hidden md:flex flex-col pt-[25px] pb-5 px-3.5 menu-kit fixed left-0 top-0 h-screen w-64 z-40 border-r border-[#a56f80]/40 shadow-[6px_0_24px_#68405a20] overflow-y-auto">
        <div className="px-px pb-[25px]">{marca}</div>
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
          className={`absolute right-0 top-0 h-full w-72 max-w-[80vw] menu-kit border-l border-[#a56f80]/40 shadow-2xl flex flex-col pt-6 pb-6 px-3.5 transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-px mb-8">
            {marca}
            <button
              onClick={closeMobile}
              aria-label={t("home.closeMenu")}
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
