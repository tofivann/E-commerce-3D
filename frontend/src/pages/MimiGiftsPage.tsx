import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Producto } from "../api/productos.api";
import { Bandeja } from "../components/layout/Bandeja";
import { Buscador } from "../components/layout/Buscador";
import { HojaSeccion } from "../components/layout/HojaSeccion";
import { useCarritoLayout } from "../components/layout/contextoLayout";
import { ProductDetailsModal } from "../components/products/ProductDetailsModal";
import { ProductList } from "../components/products/ProductList";
import { SearchInput } from "../components/products/SearchInput";
import { IconoMoneda } from "../components/ui/Monedas";
import { useCanjeMonedas } from "../hooks/useCanjeMonedas";
import { useComprasIds } from "../hooks/useComprasIds";
import { useFavoritos } from "../hooks/useFavoritos";

// "Mimi Gifts": el catálogo de lo que se canjea con MimiCoins. Es el mismo
// catálogo que Inicio (ProductList, con búsqueda y categorías) filtrado a
// los productos que aceptan MimiCoins, y las tarjetas llevan "Canjear" en
// vez de "Agregar". La ruta solo es accesible con acceso al catálogo (ver
// App.tsx); el menú y la barra los pone AppLayout, aquí va el contenido.
export const MimiGiftsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null);

  // El carrito del layout sigue disponible para lo que acepte también dinero.
  const carrito = useCarritoLayout();
  const purchasedIds = useComprasIds(true);
  const favoritos = useFavoritos(true);
  const canje = useCanjeMonedas(() => navigate("/biblioteca"));

  return (
    <>
      <Buscador>
        <SearchInput value={searchQuery} onChange={setSearchQuery} className="w-full max-w-40 sm:max-w-xs md:max-w-sm" />
      </Buscador>

      <HojaSeccion
        titulo={
          <span className="flex items-center gap-3">
            <IconoMoneda className="text-[0.9em]" />
            {t("mimiGifts.title")}
          </span>
        }
        subtitulo={t("mimiGifts.subtitle")}
      />

      <Bandeja className="flex flex-col gap-6">
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
      </Bandeja>

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
