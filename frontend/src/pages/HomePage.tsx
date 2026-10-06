import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { ProductList } from "../components/products/ProductList";
import { SearchInput } from "../components/products/SearchInput";
import { ProductDetailsModal } from "../components/products/ProductDetailsModal";
import { PrecioSuscripcion } from "../components/ui/PrecioSuscripcion";
import { AppLayout } from "../components/layout/AppLayout";
import { GuestLayout } from "../components/layout/GuestLayout";
import { useCarritoDrawer } from "../hooks/useCarritoDrawer";
import { useComprasIds } from "../hooks/useComprasIds";
import { useFavoritos } from "../hooks/useFavoritos";
import { useCanjeMonedas } from "../hooks/useCanjeMonedas";
import { accionDeTienda, leerTienda } from "../utils/tienda";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [activandoPago, setActivandoPago] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // El catálogo y el chat se desbloquean con esta misma variable de acceso
  const hasAccess = isLoggedIn && (isStaff || isSubscribed);
  const canSearch = isStaff || isSubscribed;

  const carrito = useCarritoDrawer(hasAccess);
  const purchasedIds = useComprasIds(isLoggedIn);
  const favoritos = useFavoritos(hasAccess);
  // Canje directo con MimiCoins (Tienda MimiCoins): el producto queda en la
  // biblioteca al instante, así que se va allí, como tras pagar el carrito.
  const canje = useCanjeMonedas(() => navigate("/biblioteca"));
  // Para que el detalle abierto desde la Tienda MimiCoins ofrezca canjear.
  const [searchParams] = useSearchParams();
  const accion = accionDeTienda(leerTienda(searchParams));

  // Al redirigir a Stripe/PayPal con window.location.href, activandoPago se
  // queda en true (nunca se resetea, porque se asume que la página va a
  // navegar afuera). Si el usuario le da "atrás" en el navegador en vez de
  // cerrar la pestaña, el navegador puede restaurar esta página congelada tal
  // cual estaba (bfcache) en vez de recargarla desde cero — el botón queda
  // pegado en "Validando..." hasta que alguien recarga a mano. El evento
  // "pageshow" con persisted=true detecta exactamente ese caso de restauración
  // desde bfcache, así que ahí se resetea el estado sin depender de un reload.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setActivandoPago(false);
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

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

  // Lo mismo para visitantes y para cuentas con sesión; solo cambia el
  // layout que lo envuelve.
  const contenido = (
    <>
      {isLoggedIn && !isStaff && !isSubscribed && (
        <div className="bg-error/10 border-l-4 border-error p-6 rounded-r-xl text-on-error-container flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl mt-4">
          <div>
            <h3 className="text-xl font-bold text-error">{t("home.pendingTitle")}</h3>
            <p className="text-sm text-on-error-container/80 mt-1">
              {t("home.pendingBody")}
            </p>
            <PrecioSuscripcion className="text-error mt-3" />
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
          favoritoIds={favoritos.ids}
          onAddToCart={carrito.agregar}
          onCanjear={canje.canjear}
          onGoToLibrary={() => navigate("/biblioteca")}
          onSelectProducto={setSelectedProduct}
          onToggleFavorito={favoritos.alternar}
          searchQuery={canSearch ? searchQuery : ""}
        />
      </div>
    </>
  );

  return (
    <>
      {isLoggedIn ? (
        <AppLayout
          isStaff={isStaff}
          hasAccess={hasAccess}
          onLogout={onLogoutClick}
          carrito={carrito}
          mainClassName="flex flex-col gap-16"
          barra={
            canSearch && (
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                className="w-full max-w-40 sm:max-w-xs md:max-w-sm"
              />
            )
          }
        >
          {contenido}
        </AppLayout>
      ) : (
        <GuestLayout
          onLoginClick={onLoginClick}
          onRegisterClick={onRegisterClick}
          mainClassName="flex flex-col gap-16"
        >
          {contenido}
        </GuestLayout>
      )}

      <ProductDetailsModal
        producto={selectedProduct}
        hasAccess={hasAccess}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={carrito.agregar}
        onCanjear={canje.canjear}
        accion={accion}
        isFavorito={typeof selectedProduct?.id === "number" && favoritos.ids.has(selectedProduct.id)}
        onToggleFavorito={favoritos.alternar}
      />
    </>
  );
};
