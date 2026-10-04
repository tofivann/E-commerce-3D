import React from "react";
import { useTranslation } from "react-i18next";
import { useCarritoDrawer } from "../../hooks/useCarritoDrawer";
import type { CarritoDrawer } from "../../hooks/useCarritoDrawer";
import { CartDrawer } from "../products/CartDrawer";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { PieDePagina } from "./PieDePagina";
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
  // El chat ocupa toda la altura y no lleva pie.
  sinPie?: boolean;
  // Carrito de la página, cuando esta necesita "agregar al carrito". Si no
  // se pasa, el layout maneja el suyo.
  carrito?: CarritoDrawer;
  children: React.ReactNode;
}

// Layout de las páginas con sesión iniciada (Inicio, Favoritos, Biblioteca,
// Comisiones, Chat): menú lateral, barra superior con idioma y carrito, zona
// de contenido, pie y panel del carrito. Solo dibuja: quién puede entrar a
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
  sinPie = false,
  carrito: carritoDeLaPagina,
  children,
}) => {
  const { t } = useTranslation();
  // Los hooks no pueden ser condicionales: el carrito propio existe siempre,
  // pero solo se activa (y pide datos) cuando la página no trae el suyo.
  const carritoPropio = useCarritoDrawer(hasAccess && !carritoDeLaPagina);
  const carrito = carritoDeLaPagina ?? carritoPropio;

  return (
    <div className="bg-background text-on-surface font-sans min-h-screen flex">
      <Sidebar isStaff={isStaff} hasAccess={hasAccess} onLogout={onLogout} />

      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        {/* BARRA SUPERIOR. pl-16 en móvil: deja sitio al botón de menú del Sidebar. */}
        <header className="fixed top-0 right-0 left-0 md:left-64 z-50 bg-surface/70 backdrop-blur-xl border-b border-outline-variant/30 transition-all duration-300">
          <div className="flex justify-between items-center gap-4 pl-16 pr-gutter md:px-gutter max-w-container-max mx-auto h-20">
            <div className="flex-1 min-w-0">{barra}</div>

            <div className="flex items-center gap-3 shrink-0">
              <LanguageSwitcher />
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
            </div>
          </div>
        </header>

        <main className={`flex-grow pt-24 pb-16 px-gutter md:px-16 max-w-container-max mx-auto w-full ${mainClassName}`}>
          {children}
        </main>

        {!sinPie && <PieDePagina />}
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
