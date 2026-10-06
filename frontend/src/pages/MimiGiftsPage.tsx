import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Producto } from "../api/productos.api";
import { AppLayout } from "../components/layout/AppLayout";
import { ProductDetailsModal } from "../components/products/ProductDetailsModal";
import { ProductList } from "../components/products/ProductList";
import { SearchInput } from "../components/products/SearchInput";
import { IconoMoneda } from "../components/ui/Monedas";
import { useCanjeMonedas } from "../hooks/useCanjeMonedas";
import { useCarritoDrawer } from "../hooks/useCarritoDrawer";
import { useComprasIds } from "../hooks/useComprasIds";
import { useFavoritos } from "../hooks/useFavoritos";

interface MimiGiftsPageProps {
  isStaff?: boolean;
  onLogoutClick: () => void;
}

// "Mimi Gifts": el catálogo de lo que se canjea con MimiCoins. Es el mismo
// catálogo que Inicio (ProductList, con búsqueda y categorías) filtrado a
// los productos que aceptan MimiCoins, y las tarjetas llevan "Canjear" en
// vez de "Agregar". La ruta solo es accesible con acceso al catálogo (ver App.tsx).
export const MimiGiftsPage: React.FC<MimiGiftsPageProps> = ({ isStaff = false, onLogoutClick }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null);

  // El carrito sigue disponible (icono y panel) para lo que acepte también dinero.
  const carrito = useCarritoDrawer(true);
  const purchasedIds = useComprasIds(true);
  const favoritos = useFavoritos(true);
  const canje = useCanjeMonedas(() => navigate("/biblioteca"));

  return (
    <>
      <AppLayout
        isStaff={isStaff}
        hasAccess
        onLogout={onLogoutClick}
        carrito={carrito}
        mainClassName="flex flex-col gap-6"
        barra={<SearchInput value={searchQuery} onChange={setSearchQuery} className="w-full max-w-40 sm:max-w-xs md:max-w-sm" />}
      >
        <div className="border-b border-outline-variant/20 pb-4 flex items-start gap-3">
          <IconoMoneda className="text-[40px] mt-0.5" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-on-surface">{t("mimiGifts.title")}</h1>
            <p className="text-on-surface-variant text-sm mt-1">{t("mimiGifts.subtitle")}</p>
          </div>
        </div>

        <ProductList
          tienda="monedas"
          hasAccess
          purchasedIds={purchasedIds}
          favoritoIds={favoritos.ids}
          onAddToCart={carrito.agregar}
          onCanjear={canje.canjear}
          onGoToLibrary={() => navigate("/biblioteca")}
          onSelectProducto={setSeleccionado}
          onToggleFavorito={favoritos.alternar}
          searchQuery={searchQuery}
        />
      </AppLayout>

      <ProductDetailsModal
        producto={seleccionado}
        hasAccess
        onClose={() => setSeleccionado(null)}
        onAddToCart={carrito.agregar}
        onCanjear={canje.canjear}
        accion="canje"
        isFavorito={typeof seleccionado?.id === "number" && favoritos.ids.has(seleccionado.id)}
        onToggleFavorito={favoritos.alternar}
      />
    </>
  );
};
