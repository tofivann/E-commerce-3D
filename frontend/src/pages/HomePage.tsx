import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { ProductList } from "../components/products/ProductList";
import { SearchInput } from "../components/products/SearchInput";
import { CartDrawer } from "../components/products/CartDrawer";
import { ProductDetailsModal } from "../components/products/ProductDetailsModal";
import { Sidebar } from "../components/layout/Sidebar";
import { LanguageSwitcher } from "../components/layout/LanguageSwitcher";
import { carritoApi } from "../api/carrito.api";
import { bibliotecaApi } from "../api/biblioteca.api";
import { capturarOrdenPayPal } from "../api/paypal.api";
import { userApi } from "../services/userApi";
import type { Producto } from "../api/productos.api";
import mmdScene from "../assets/mmd-scene.webp";

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

  const handleActivarCuentaPayPalAprobado = async (paypalOrderId: string) => {
    try {
      await capturarOrdenPayPal(paypalOrderId);
      // El backend ya confirmó el pago y activó la suscripción; refrescamos
      // el estado local para que App.tsx lo relea desde localStorage.
      localStorage.setItem("estado_suscripcion", "ACTIVO");
      window.location.reload();
    } catch (err: any) {
      console.error("Error al capturar el pago de PayPal:", err);
      window.alert(t("common.paypalError"));
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
          <div
            className={`flex justify-between items-center gap-4 pr-gutter md:px-gutter max-w-container-max mx-auto h-20 ${
              isLoggedIn ? "pl-16 md:pl-gutter" : "pl-gutter"
            }`}
          >
            {isLoggedIn ? (
              <>
                {canSearch ? (
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    className="w-full max-w-40 sm:max-w-xs md:max-w-sm"
                  />
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-3 shrink-0">
                  <LanguageSwitcher />
                  {hasAccess && (
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
                  )}
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
            <div className="bg-error/10 border-l-4 border-error p-6 rounded-r-xl text-on-error-container flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl mt-4">
              <div>
                <h3 className="text-xl font-bold text-error">{t("home.pendingTitle")}</h3>
                <p className="text-sm text-on-error-container/80 mt-1">
                  {t("home.pendingBody")}
                </p>
              </div>
              <div className="flex flex-col gap-2 items-stretch w-full md:w-56">
                <button
                  onClick={handleActivarCuenta}
                  disabled={activandoPago}
                  className="px-6 py-3 bg-error hover:bg-error/90 text-on-error font-bold rounded-xl transition duration-200 shadow-lg shadow-error/20 disabled:opacity-50 whitespace-nowrap"
                >
                  {activandoPago ? t("home.pendingLoading") : t("home.pendingCta")}
                </button>
                <PayPalButtons
                  style={{ layout: "horizontal", height: 40 }}
                  disabled={activandoPago}
                  createOrder={async () => {
                    const { paypal_order_id } = await userApi.activarCuentaPayPal();
                    return paypal_order_id;
                  }}
                  onApprove={(data) => handleActivarCuentaPayPalAprobado(data.orderID)}
                  onError={() => window.alert(t("common.paypalError"))}
                />
              </div>
            </div>
          )}
          
          {/* Banner Hero */}
          <section className="relative w-full rounded-2xl overflow-hidden isolate mt-8 bg-linear-to-b from-surface-bright via-surface-container-low to-surface-container">
            {/* Fondo decorativo */}
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-surface-bright blur-3xl pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-secondary-container/60 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-secondary-container/40 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-primary-container/50 blur-3xl pointer-events-none" />
            <div className="absolute -top-1/2 -left-1/3 w-[150%] aspect-square rounded-full border-2 border-white/70 pointer-events-none" />

            {/* Chispas */}
            <span className="material-symbols-outlined absolute left-[6%] top-[10%] text-primary-container text-3xl animate-pulse pointer-events-none" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <span className="material-symbols-outlined absolute right-[8%] top-[8%] text-secondary-container text-2xl animate-pulse [animation-delay:700ms] pointer-events-none" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <span className="material-symbols-outlined absolute right-[10%] top-[45%] text-primary-container text-4xl animate-pulse [animation-delay:1200ms] pointer-events-none hidden md:block" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <span className="material-symbols-outlined absolute left-[10%] bottom-[10%] text-secondary-container text-2xl animate-pulse [animation-delay:400ms] pointer-events-none hidden md:block" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>

            <div className="relative flex flex-col md:flex-row items-center gap-10 p-6 sm:p-10 md:p-14">
              {/* Columna de texto */}
              <div className="flex flex-col gap-5 md:gap-7 md:flex-1 md:max-w-[50%]">
                <h1 className="font-bold text-on-surface text-4xl sm:text-5xl md:text-6xl leading-[1.05] tracking-tight max-w-[15ch]">
                  {t("home.heroTitleLine1")}{" "}
                  <span className="text-primary">{t("home.heroTitleConnector")}</span>{" "}
                  <span className="bg-linear-to-r from-primary via-secondary to-[#4598D8] bg-clip-text text-transparent">
                    {t("home.heroTitleBrand")}
                  </span>
                </h1>
                <p className="text-on-surface-variant font-light text-lg md:text-xl max-w-[32ch]">
                  {t("home.heroSubtitle")}
                </p>

                <ul className="grid grid-cols-3 gap-3 md:gap-6 max-w-[520px]">
                  <li className="flex flex-col items-center gap-2 text-center">
                    <span className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-primary bg-white/60 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[26px]">view_in_ar</span>
                    </span>
                    <span className="text-on-surface-variant text-xs md:text-sm font-medium">{t("home.heroFeature1")}</span>
                  </li>
                  <li className="flex flex-col items-center gap-2 text-center">
                    <span className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-[#4598D8] bg-white/60 flex items-center justify-center text-[#4598D8]">
                      <span className="material-symbols-outlined text-[26px]">directions_run</span>
                    </span>
                    <span className="text-on-surface-variant text-xs md:text-sm font-medium">{t("home.heroFeature2")}</span>
                  </li>
                  <li className="flex flex-col items-center gap-2 text-center">
                    <span className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-secondary bg-white/60 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[26px]">mood</span>
                    </span>
                    <span className="text-on-surface-variant text-xs md:text-sm font-medium">{t("home.heroFeature3")}</span>
                  </li>
                </ul>

                {!isLoggedIn && (
                  <button
                    onClick={onRegisterClick}
                    className="self-start bg-primary-container text-on-primary-fixed btn-glow-inner rounded px-8 py-3 text-lg font-bold hover:bg-primary-fixed-dim transition-all active:scale-95 shadow-[0_4px_18px_rgba(232,137,174,0.45)]"
                  >
                    {t("home.heroCta")}
                  </button>
                )}
              </div>

              {/* Foto */}
              <div className="w-full md:flex-1 md:max-w-[46%]">
                <div className="relative rounded-3xl overflow-hidden shadow-xl ring-1 ring-white/70 aspect-[4/5] md:aspect-[5/6] bg-white">
                  <img
                    src={mmdScene}
                    alt={t("home.heroAlt")}
                    className="w-full h-full object-cover object-[56%_35%]"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Lista de productos */}
          <div className={isLoggedIn ? "mt-8" : "mt-0"}>
            <ProductList
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