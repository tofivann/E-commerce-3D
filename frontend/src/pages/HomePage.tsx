import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProductList } from "../components/products/ProductList";
import { CartDrawer } from "../components/products/CartDrawer";
import { ProductDetailsModal } from "../components/products/ProductDetailsModal";
import { Sidebar } from "../components/layout/Sidebar";
import { LanguageSwitcher } from "../components/layout/LanguageSwitcher";
import { carritoApi } from "../api/carrito.api";
import { bibliotecaApi } from "../api/biblioteca.api";
import { userApi } from "../services/userApi";
import type { Producto } from "../api/productos.api";
import heroImage from "../assets/hero1.webp";

interface HomePageProps {
  isLoggedIn: boolean;
  isStaff?: boolean;
  isSubscribed?: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onRegisterClick: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  isLoggedIn,
  isStaff = false,
  isSubscribed = false,
  onLoginClick,
  onLogoutClick,
  onRegisterClick,
}) => {
  const [cartOpen, setCartOpen] = useState(false);
  const [cartRefreshKey, setCartRefreshKey] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());
  const [activandoPago, setActivandoPago] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [guestMenuOpen, setGuestMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // El catálogo y el chat se desbloquean con esta misma variable de acceso
  const hasAccess = isLoggedIn && (isStaff || isSubscribed);
  const canSearch = isStaff || isSubscribed;

  useEffect(() => {
    if (!isLoggedIn) {
      setCartCount(0);
      return;
    }
    carritoApi
      .obtener()
      .then((carrito) => setCartCount(carrito.items.length))
      .catch((err) => console.error("Error al cargar el carrito:", err));
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setPurchasedIds(new Set());
      return;
    }
    bibliotecaApi
      .listar()
      .then((compras) => {
        const ids = compras
          .map((compra) => compra.producto.id)
          .filter((id): id is number => typeof id === "number");
        setPurchasedIds(new Set(ids));
      })
      .catch((err) => console.error("Error al cargar la biblioteca:", err));
  }, [isLoggedIn]);

  const handleAddToCart = async (producto: Producto) => {
    if (!producto.id) return;
    try {
      await carritoApi.agregarItem(producto.id);
      setCartRefreshKey((k) => k + 1);
      setCartOpen(true);
    } catch (err) {
      console.error("Error al agregar al carrito:", err);
      window.alert("No se pudo agregar el producto al carrito.");
    }
  };

  const handleActivarCuenta = async () => {
    try {
      setActivandoPago(true);
      const data = await userApi.activarCuenta();
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        window.alert("No se pudo obtener el link de pago.");
        setActivandoPago(false);
      }
    } catch (err) {
      console.error("Error al activar cuenta:", err);
      window.alert("No se pudo conectar con la pasarela de pagos. Si ya realizaste el cobro, tu cuenta se activará automáticamente en breve.");
      setActivandoPago(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-sans min-h-screen flex">
      {isLoggedIn && (
        <Sidebar isStaff={isStaff} hasAccess={hasAccess} onLogout={onLogoutClick} />
      )}

      <div className={`flex-1 flex flex-col min-w-0 ${isLoggedIn ? "md:ml-64" : ""}`}>
        {/* BARRA SUPERIOR */}
        <header
          className={`fixed top-0 right-0 left-0 ${
            isLoggedIn ? "md:left-64" : ""
          } z-50 bg-surface/70 backdrop-blur-xl border-b border-outline-variant/30 transition-all duration-300`}
        >
          <div className="flex justify-between items-center gap-4 px-gutter max-w-container-max mx-auto h-20">
            {isLoggedIn ? (
              <>
                {canSearch ? (
                  <div className="relative w-full max-w-sm">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("common.search")}
                      className="w-full bg-surface-variant border border-outline-variant rounded-full pl-10 pr-4 py-2.5 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-3 shrink-0">
                  <LanguageSwitcher />
                  <button
                    onClick={() => setCartOpen(true)}
                    aria-label={t("common.cart")}
                    className="relative text-on-surface-variant hover:text-primary transition-colors p-2"
                  >
                    <span className="material-symbols-outlined">shopping_cart</span>
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary-container text-on-primary-fixed text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-[32px]">
                    architecture
                  </span>
                  <span className="font-bold text-[24px] tracking-tighter text-primary">
                    {t("common.appName")}
                  </span>
                </div>

                {/* Escritorio: botones directos */}
                <div className="hidden md:flex items-center gap-4">
                  <LanguageSwitcher />
                  <button
                    onClick={onLoginClick}
                    className="text-on-surface-variant hover:text-primary transition-colors px-4 py-2"
                  >
                    {t("home.login")}
                  </button>
                  <button
                    onClick={onRegisterClick}
                    className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded px-6 py-2 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95"
                  >
                    {t("home.register")}
                  </button>
                </div>

                {/* Móvil: hamburguesa */}
                <button
                  onClick={() => setGuestMenuOpen(true)}
                  aria-label={t("home.menu")}
                  className="md:hidden w-10 h-10 rounded-full bg-surface-container-low/90 border border-outline-variant/30 flex items-center justify-center text-on-surface"
                >
                  <span className="material-symbols-outlined">menu</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Menú móvil de invitado (mismo estilo que el drawer del Sidebar logueado) */}
        {!isLoggedIn && (
          <div
            className={`md:hidden fixed inset-0 z-110 transition-opacity duration-300 ${
              guestMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          >
            <div
              className="absolute inset-0 bg-background/60 backdrop-blur-sm"
              onClick={() => setGuestMenuOpen(false)}
            />
            <aside
              className={`absolute right-0 top-0 h-full w-72 max-w-[80vw] bg-surface-container-low/95 backdrop-blur-2xl border-l border-outline-variant/30 shadow-2xl flex flex-col pt-6 pb-6 px-3 transition-transform duration-300 ease-out ${
                guestMenuOpen ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="flex items-center justify-between px-3 mb-8">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[28px]">
                    architecture
                  </span>
                  <span className="font-bold text-xl tracking-tighter text-primary">
                    {t("common.appName")}
                  </span>
                </div>
                <button
                  onClick={() => setGuestMenuOpen(false)}
                  aria-label={t("home.closeMenu")}
                  className="text-on-surface-variant hover:text-primary transition-colors w-9 h-9 rounded-full hover:bg-surface-variant/50 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="px-3 mb-6">
                <LanguageSwitcher />
              </div>

              <div className="flex flex-col gap-2 px-3">
                <button
                  onClick={() => {
                    setGuestMenuOpen(false);
                    onLoginClick();
                  }}
                  className="w-full text-left px-4 py-2.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-primary-container/10 transition-colors"
                >
                  {t("home.login")}
                </button>
                <button
                  onClick={() => {
                    setGuestMenuOpen(false);
                    onRegisterClick();
                  }}
                  className="w-full bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg px-4 py-2.5 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95"
                >
                  {t("home.register")}
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-grow pt-24 pb-16 px-gutter md:px-16 max-w-container-max mx-auto w-full flex flex-col gap-16">
          {isLoggedIn && !isStaff && !isSubscribed && (
            <div className="bg-amber-500/10 border-l-4 border-amber-500 p-6 rounded-r-xl text-amber-200 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl mt-4">
              <div>
                <h3 className="text-xl font-bold text-amber-400">{t("home.pendingTitle")}</h3>
                <p className="text-sm text-amber-200/80 mt-1">
                  {t("home.pendingBody")}
                </p>
              </div>
              <button
                onClick={handleActivarCuenta}
                disabled={activandoPago}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl transition duration-200 shadow-lg shadow-amber-500/20 disabled:opacity-50 whitespace-nowrap"
              >
                {activandoPago ? t("home.pendingLoading") : t("home.pendingCta")}
              </button>
            </div>
          )}
          
          {/* Banner Hero */}
          <section className="relative w-full rounded-xl overflow-hidden glass-panel min-h-100 flex items-end justify-center text-center mt-8">
            <img
              src={heroImage}
              alt={t("home.heroAlt")}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent"></div>
            {!isLoggedIn && (
              <div className="relative z-10 flex flex-col items-center gap-4 max-w-xl p-8">
                <button
                  onClick={onRegisterClick}
                  className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded px-8 py-3 text-lg font-bold hover:bg-primary-fixed-dim transition-all active:scale-95 shadow-[0_4px_18px_rgba(232,137,174,0.45)]"
                >
                  {t("home.heroCta")}
                </button>
              </div>
            )}
          </section>

          {/* Lista de productos */}
          <div className={isLoggedIn ? "mt-8" : "mt-0"}>
            <ProductList
              isLoggedIn={isLoggedIn}
              hasAccess={hasAccess}
              purchasedIds={purchasedIds}
              onAddToCart={handleAddToCart}
              onGoToLibrary={() => navigate("/biblioteca")}
              onSelectProducto={setSelectedProduct}
              searchQuery={canSearch ? searchQuery : ""}
            />
          </div>
        </main>

        {/* FOOTER */}
        <footer className="bg-background w-full py-16 border-t border-outline-variant/20 mt-auto">
          <div className="flex flex-col md:flex-row justify-between items-center px-gutter max-w-container-max mx-auto gap-4">
            <div className="text-[24px] font-bold text-primary opacity-50">{t("common.appName")}</div>
            <div className="text-on-surface-variant text-sm">{t("home.footerRights")}</div>
          </div>
        </footer>
      </div>

      {isLoggedIn && (
        <CartDrawer
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          refreshKey={cartRefreshKey}
          onCartChange={(carrito) => setCartCount(carrito?.items.length ?? 0)}
        />
      )}

      <ProductDetailsModal
        producto={selectedProduct}
        hasAccess={hasAccess}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
};