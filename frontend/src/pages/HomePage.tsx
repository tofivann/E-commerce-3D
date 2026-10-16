import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { ProductList } from "../components/products/ProductList";
import { SearchInput } from "../components/products/SearchInput";
import { ProductDetailsModal } from "../components/products/ProductDetailsModal";
import { PrecioSuscripcion } from "../components/ui/PrecioSuscripcion";
import { AppLayout } from "../components/layout/AppLayout";
import { GuestLayout } from "../components/layout/GuestLayout";
import { HeroAtelier, ID_CATALOGO } from "../components/home/HeroAtelier";
import { useCarritoDrawer } from "../hooks/useCarritoDrawer";
import { useComprasIds } from "../hooks/useComprasIds";
import { useFavoritos } from "../hooks/useFavoritos";
import { useCanjeMonedas } from "../hooks/useCanjeMonedas";
import { capturarOrdenPayPal } from "../api/paypal.api";
import { userApi } from "../services/userApi";
import type { Producto } from "../api/productos.api";

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
  // Canje directo con MimiCoins (un producto que solo acepta MimiCoins): el
  // producto queda en la biblioteca al instante, así que se va allí.
  const canje = useCanjeMonedas(() => navigate("/biblioteca"), hasAccess);

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
        <div className="interactivo bg-error/10 border-l-4 border-error p-6 rounded-r-xl text-on-error-container flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl mt-4">
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

      {/* Hero: la hoja de papel sobre la escena (Mimi está en el fondo). */}
      <HeroAtelier
        isLoggedIn={isLoggedIn}
        hasAccess={hasAccess}
        onLoginClick={onLoginClick}
        onRegisterClick={onRegisterClick}
      />

      {/* Lista de productos, en su bandeja de papel (el hero va fuera, sobre la escena). */}
      <div id={ID_CATALOGO} className="bandeja-kit scroll-mt-24">
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
          sinBandeja
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
        isFavorito={typeof selectedProduct?.id === "number" && favoritos.ids.has(selectedProduct.id)}
        onToggleFavorito={favoritos.alternar}
      />
    </>
  );
};
