import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SaldoMonedas } from "./SaldoMonedas";
import { IconoConejo, IconoCorazon } from "../ui/IconosKit";
import { IconoMoneda } from "../ui/Monedas";

interface SidebarProps {
  isStaff: boolean;
  hasAccess: boolean; // admin o suscriptor activo: desbloquea el chat de soporte
  onLogout: () => void;
}

// Enlaces al estilo del kit: pastilla con borde, rosa con una barra a la
// izquierda cuando es la sección activa.
const linkBase =
  "flex items-center gap-3 min-h-[52px] px-3 py-2.5 my-1 rounded-lg border transition-colors w-full no-underline text-[14px] font-semibold";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? `${linkBase} text-[#b72e61] bg-linear-to-r from-[#f4bbce] to-[#f2c6cf] border-[#df93ad] shadow-[inset_4px_0_#dc4a7c,0_3px_10px_#bd6c8417]`
    : `${linkBase} text-[#484469] border-transparent hover:bg-[#efd0c5]`;

export const Sidebar: React.FC<SidebarProps> = ({ isStaff, hasAccess, onLogout }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);
  const { t } = useTranslation();

  // Marca del kit: la conejita, el nombre y el lema debajo.
  const marca = (
    <NavLink to="/" end className="flex items-center gap-2 no-underline" onClick={closeMobile}>
      <IconoConejo className="w-[34px] h-[42px] text-vino shrink-0" />
      <span className="flex flex-col leading-tight">
        <span className="text-[22px] font-extrabold tracking-[-1px] text-vino">{t("common.appName")}</span>
        <small className="text-[9px] font-medium tracking-[2px] uppercase text-malva mt-1">{t("common.tagline")}</small>
      </span>
    </NavLink>
  );

  // La postal con el corazón, debajo de los enlaces.
  const postal = (
    <div className="postal-kit relative mx-[9px] mt-8 mb-4 px-3.5 py-[19px] text-[13px] text-[#856779]">
      <IconoCorazon className="w-[19px] h-[19px] text-[#ce7a96]" />
      <p className="my-2.5 font-serif italic text-[17px] leading-snug">
        {t("sidebar.postalLinea1")}
        <br />
        {t("sidebar.postalLinea2")}
      </p>
      <span className="block h-px w-[65%] bg-[#d6aab2]" />
    </div>
  );

  const navLinks = (
    <nav className="flex-1">
      <NavLink to="/" end className={linkClass} onClick={closeMobile}>
        <span className="material-symbols-outlined text-[20px]">storefront</span>
        {t("sidebar.home")}
      </NavLink>

      {/* Novedades, Favoritos, Biblioteca, Comisiones y el chat solo se muestran con suscripción
          activa o staff; una cuenta pendiente de pago/inactiva no tiene nada que mostrar ahí todavía. */}
      {hasAccess && (
        <NavLink to="/novedades" className={linkClass} onClick={closeMobile}>
          <span className="material-symbols-outlined text-[20px]">newspaper</span>
          {t("sidebar.novedades")}
        </NavLink>
      )}

      {hasAccess && (
        <NavLink to="/favoritos" className={linkClass} onClick={closeMobile}>
          <span className="material-symbols-outlined text-[20px]">favorite</span>
          {t("sidebar.favorites")}
        </NavLink>
      )}

      {/* Mimi Gifts: lo que se canjea con MimiCoins. Lleva la moneda como icono. */}
      {hasAccess && (
        <NavLink to="/mimi-gifts" className={linkClass} onClick={closeMobile}>
          <IconoMoneda className="text-[20px]" />
          {t("sidebar.mimiGifts")}
        </NavLink>
      )}

      {hasAccess && (
        <NavLink to="/biblioteca" className={linkClass} onClick={closeMobile}>
          <span className="material-symbols-outlined text-[20px]">inventory_2</span>
          {t("sidebar.library")}
        </NavLink>
      )}

      {hasAccess && (
        <NavLink to="/comisiones" className={linkClass} onClick={closeMobile}>
          <span className="material-symbols-outlined text-[20px]">design_services</span>
          {t("sidebar.commissions")}
        </NavLink>
      )}

      {hasAccess && (
        <NavLink to="/soporte" className={linkClass} onClick={closeMobile}>
          <span className="material-symbols-outlined text-[20px]">chat</span>
          {t("sidebar.support")}
        </NavLink>
      )}

      {isStaff && (
        <NavLink to="/admin" className={linkClass} onClick={closeMobile}>
          <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
          {t("sidebar.admin")}
        </NavLink>
      )}
    </nav>
  );

  const logoutButton = (
    <div className="mt-auto">
      <button
        onClick={onLogout}
        className={`${linkBase} text-[#484469] border-transparent hover:text-error hover:bg-error/10 text-left`}
      >
        <span className="material-symbols-outlined text-[20px]">logout</span>
        {t("sidebar.logout")}
      </button>
    </div>
  );

  return (
    <>
      {/* Botón de menú, solo visible en móvil */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label={t("home.menu")}
        className="oculto-en-deseo md:hidden fixed top-4 left-4 z-60 w-10 h-10 rounded-full bg-surface-container-low/90 backdrop-blur border border-outline-variant/30 flex items-center justify-center text-on-surface shadow-md"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      {/* Sidebar de escritorio */}
      <aside className="oculto-en-deseo hidden md:flex flex-col pt-[25px] pb-5 px-3.5 menu-kit fixed left-0 top-0 h-screen w-64 z-40 border-r border-[#a56f80]/40 shadow-[6px_0_24px_#68405a20] overflow-y-auto">
        <div className="px-px pb-[25px]">{marca}</div>
        {navLinks}
        {postal}
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
          className={`absolute right-0 top-0 h-full w-72 max-w-[80vw] menu-kit border-l border-[#a56f80]/40 shadow-2xl flex flex-col pt-6 pb-6 px-3.5 transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-px mb-8">
            {marca}
            <button
              onClick={closeMobile}
              aria-label={t("home.closeMenu")}
              className="text-on-surface-variant hover:text-primary transition-colors w-9 h-9 rounded-full hover:bg-surface-variant/50 flex items-center justify-center"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          {/* En móvil el selector de idioma y el saldo de monedas no caben
              en la cabecera (ver AppLayout). */}
          <div className="px-3 mb-6 flex flex-wrap items-center gap-3">
            <LanguageSwitcher />
            {hasAccess && <SaldoMonedas />}
          </div>
          {navLinks}
          {logoutButton}
        </aside>
      </div>
    </>
  );
};
