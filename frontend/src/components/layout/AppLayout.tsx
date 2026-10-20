import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCarritoDrawer } from "../../hooks/useCarritoDrawer";
import { usePerfil } from "../../hooks/usePerfil";
import { Avatar } from "../ui/Avatar";
import { CartDrawer } from "../products/CartDrawer";
import { ContextoLayout } from "./contextoLayout";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { PieDePagina } from "./PieDePagina";
import { SaldoMonedas } from "./SaldoMonedas";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  isStaff: boolean;
  // Admin o suscriptor activo: decide qué enlaces muestra el menú y si hay carrito.
  hasAccess: boolean;
  onLogout: () => void;
}

// Layout de las páginas con sesión iniciada (Inicio, Favoritos, Biblioteca,
// Comisiones, Chat, Mi perfil…): menú lateral, barra superior con idioma,
// carrito y la miniatura del perfil, zona de contenido, pie y panel del
// carrito. Se monta UNA vez en App.tsx como ruta "layout" y las páginas se
// dibujan en su <Outlet />: así cambiar de sección no reconstruye el menú ni
// la barra (el globo de mensajes y el contador del carrito no parpadean ni
// se vuelven a pedir). Solo dibuja: quién puede entrar a cada página lo
// deciden las rutas (App.tsx), no este componente.
//
// Lo que cada página aporta lo dibuja ella misma dentro del <Outlet />: su
// HojaSeccion, su Bandeja y, si tiene buscador, <Buscador> para colgarlo en
// la barra superior. El carrito lo toma con useCarritoLayout().
//
// Fuera de este layout, a propósito: la portada de visitante (GuestLayout),
// el panel admin (AdminPage/AdminSidebar) y las pantallas de login, registro y pago.
export const AppLayout: React.FC<AppLayoutProps> = ({ isStaff, hasAccess, onLogout }) => {
  const { t } = useTranslation();
  const { perfil } = usePerfil();
  const { pathname } = useLocation();
  const carrito = useCarritoDrawer(hasAccess);
  // El hueco de la barra donde la página cuelga su buscador (Buscador). Es
  // estado, no una ref, para que la página se entere de cuándo existe.
  const [nodoBarra, setNodoBarra] = useState<HTMLElement | null>(null);

  // Cada sección empieza arriba del todo. Antes el layout se reconstruía con
  // cada página; ahora el documento es el mismo y el scroll se quedaría donde
  // estuviera al cambiar de sección.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <ContextoLayout.Provider value={{ carrito, nodoBarra }}>
      <div className="text-on-surface font-sans min-h-screen flex">
        {/* La escena de Mimi la monta App.tsx (una vez para toda la app); aquí
            el contenido va por encima pero deja pasar los clics (.sobre-escena). */}
        <Sidebar isStaff={isStaff} hasAccess={hasAccess} onLogout={onLogout} />

        <div className="sobre-escena oculto-en-deseo relative z-10 flex-1 flex flex-col min-w-0 md:ml-64">
          {/* BARRA SUPERIOR. pl-16 en móvil: deja sitio al botón de menú del Sidebar. */}
          <header className="fixed top-0 right-0 left-0 md:left-64 z-50 bg-surface/70 backdrop-blur-xl border-b border-outline-variant/30 transition-all duration-300">
            <div className="flex justify-between items-center gap-4 pl-16 pr-gutter md:px-gutter max-w-container-max mx-auto h-20">
              {/* Aquí cuelga la página su buscador (Buscador); vacío si no tiene. */}
              <div ref={setNodoBarra} className="flex-1 min-w-0" />

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

          {/* La página: su hoja sobre la escena y, debajo, su bandeja (o el
              panel del chat, o el hero de Inicio). */}
          <main className="flex-grow pt-24 pb-16 px-gutter md:px-16 max-w-container-max mx-auto w-full flex flex-col gap-16">
            <Outlet />
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
    </ContextoLayout.Provider>
  );
};
