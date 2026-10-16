import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCarritoDrawer } from "../../hooks/useCarritoDrawer";
import { usePerfil } from "../../hooks/usePerfil";
import { Avatar } from "../ui/Avatar";
import type { CarritoDrawer } from "../../hooks/useCarritoDrawer";
import { CartDrawer } from "../products/CartDrawer";
import { BotonVolverDeseo } from "../escena/BotonVolverDeseo";
import { ControlesEscena } from "../escena/ControlesEscena";
import { EscenaMimi } from "../escena/EscenaMimi";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { PieDePagina } from "./PieDePagina";
import { SaldoMonedas } from "./SaldoMonedas";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  isStaff: boolean;
  // Admin o suscriptor activo: decide qué enlaces muestra el menú y si hay carrito.
  hasAccess: boolean;
  onLogout: () => void;
  // Contenido propio de la página para la izquierda de la barra superior
  // (p. ej. su buscador). Sin esto, la barra solo lleva idioma y carrito.
  barra?: React.ReactNode;
  // Clases extra para <main> (p. ej. "flex flex-col gap-8"); el espaciado
  // base y el ancho máximo los pone el layout.
  mainClassName?: string;
  // Carrito de la página, cuando esta necesita "agregar al carrito". Si no
  // se pasa, el layout maneja el suyo.
  carrito?: CarritoDrawer;
  // Primera pantalla de la sección sobre la escena (una HojaSeccion con el
  // título); la bandeja con el contenido queda debajo, al hacer scroll.
  hoja?: React.ReactNode;
  // Por defecto el contenido va dentro de una bandeja de papel (se lee sobre
  // la escena). Las páginas que ya dibujan su propio panel (el chat) o que
  // ponen cosas directamente sobre la escena (el hero de Inicio) la quitan.
  sinBandeja?: boolean;
  children: React.ReactNode;
}

// Layout de las páginas con sesión iniciada (Inicio, Favoritos, Biblioteca,
// Comisiones, Chat, Mi perfil): menú lateral, barra superior con idioma,
// carrito y la miniatura del perfil, zona de contenido, pie y panel del carrito. Solo dibuja: quién puede entrar a
// cada página lo deciden las rutas (App.tsx), no este componente.
//
// Fuera de este layout, a propósito: la portada de visitante (HomePage sin
// sesión), el panel admin (AdminPage/AdminSidebar) y las pantallas de
// login, registro y pago.
export const AppLayout: React.FC<AppLayoutProps> = ({
  isStaff,
  hasAccess,
  onLogout,
  barra,
  mainClassName = "",
  carrito: carritoDeLaPagina,
  hoja,
  sinBandeja = false,
  children,
}) => {
  const { t } = useTranslation();
  const { perfil } = usePerfil();
  // Los hooks no pueden ser condicionales: el carrito propio existe siempre,
  // pero solo se activa (y pide datos) cuando la página no trae el suyo.
  const carritoPropio = useCarritoDrawer(hasAccess && !carritoDeLaPagina);
  const carrito = carritoDeLaPagina ?? carritoPropio;

  return (
    <div className="text-on-surface font-sans min-h-screen flex">
      {/* Escenario pintado de fondo (fijo) y su botonera; el resto va por
          encima pero deja pasar los clics a la escena (.sobre-escena). */}
      <EscenaMimi conMenuLateral />
      <ControlesEscena />
      <BotonVolverDeseo />
      <Sidebar isStaff={isStaff} hasAccess={hasAccess} onLogout={onLogout} />

      <div className="sobre-escena oculto-en-deseo relative z-10 flex-1 flex flex-col min-w-0 md:ml-64">
        {/* BARRA SUPERIOR. pl-16 en móvil: deja sitio al botón de menú del Sidebar. */}
        <header className="fixed top-0 right-0 left-0 md:left-64 z-50 bg-surface/70 backdrop-blur-xl border-b border-outline-variant/30 transition-all duration-300">
          <div className="flex justify-between items-center gap-4 pl-16 pr-gutter md:px-gutter max-w-container-max mx-auto h-20">
            <div className="flex-1 min-w-0">{barra}</div>

            <div className="flex items-center gap-3 shrink-0">
              {/* En móvil el idioma vive en el menú (Sidebar), como en la
                  portada de visitante: con carrito y perfil ya no cabe aquí
                  sin aplastar el buscador. */}
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>
              {/* Saldo de monedas. En móvil vive en el menú (Sidebar), como
                  el idioma: aquí aplastaría el buscador. */}
              {hasAccess && (
                <div className="hidden sm:block">
                  <SaldoMonedas />
                </div>
              )}
              {hasAccess && (
                <button
                  onClick={carrito.abrir}
                  aria-label={t("common.cart")}
                  className="relative text-on-surface-variant hover:text-primary transition-colors p-2"
                >
                  <span className="material-symbols-outlined">shopping_cart</span>
                  {carrito.cantidad > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary-container text-on-primary-fixed text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {carrito.cantidad}
                    </span>
                  )}
                </button>
              )}
              {/* Miniatura del perfil: lleva a "Mi perfil". Para cualquier
                  cuenta con sesión, tenga o no suscripción. */}
              <Link to="/perfil" aria-label={t("perfil.title")} title={t("perfil.title")} className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Avatar foto={perfil?.foto_perfil} nombre={perfil?.nombre || perfil?.username} />
              </Link>
            </div>
          </div>
        </header>

        <main className={`flex-grow pt-24 pb-16 px-gutter md:px-16 max-w-container-max mx-auto w-full flex flex-col gap-16 ${sinBandeja ? mainClassName : ""}`}>
          {hoja}
          {sinBandeja ? children : <div className={`bandeja-kit ${mainClassName}`}>{children}</div>}
        </main>

        <PieDePagina />
      </div>

      {hasAccess && (
        <CartDrawer
          isOpen={carrito.abierto}
          onClose={carrito.cerrar}
          refreshKey={carrito.refreshKey}
          onCartChange={carrito.sincronizar}
        />
      )}
    </div>
  );
};
