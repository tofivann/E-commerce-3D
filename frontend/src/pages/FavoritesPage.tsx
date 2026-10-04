import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { favoritosApi } from "../api/favoritos.api";
import type { Producto } from "../api/productos.api";
import { CartDrawer } from "../components/products/CartDrawer";
import { ProductDetailsModal } from "../components/products/ProductDetailsModal";
import { ProductGrid } from "../components/products/ProductGrid";
import { ProductGridSkeleton } from "../components/products/ProductGridSkeleton";
import { Sidebar } from "../components/layout/Sidebar";
import { InfiniteScrollSentinel } from "../components/ui/InfiniteScrollSentinel";
import { useCarritoDrawer } from "../hooks/useCarritoDrawer";
import { useComprasIds } from "../hooks/useComprasIds";
import { useListaPaginada } from "../hooks/useListaPaginada";

interface FavoritesPageProps {
  isStaff?: boolean;
  onLogoutClick: () => void;
}

const idDeProducto = (producto: Producto) => producto.id;

// Página "Favoritos": los productos que el usuario guardó con el corazón,
// con las mismas tarjetas del catálogo para poder comprarlos desde aquí.
// La ruta solo es accesible con acceso al catálogo (ver App.tsx).
export const FavoritesPage: React.FC<FavoritesPageProps> = ({ isStaff = false, onLogoutClick }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null);

  const carrito = useCarritoDrawer();
  const purchasedIds = useComprasIds(true);
  const lista = useListaPaginada<Producto>({
    clave: "favoritos",
    cargarPagina: favoritosApi.listar,
    obtenerId: idDeProducto,
  });

  // Todo lo que se lista aquí es favorito: el corazón sale siempre marcado.
  const favoritoIds = useMemo(
    () => new Set(lista.items.map(idDeProducto).filter((id): id is number => typeof id === "number")),
    [lista.items]
  );

  // En esta página el corazón solo puede quitar. Optimista: la tarjeta
  // desaparece al instante; si el servidor falla se recarga la lista real.
  const quitar = async (producto: Producto) => {
    const id = producto.id;
    if (typeof id !== "number") return;
    lista.eliminarItem(id);
    if (seleccionado?.id === id) setSeleccionado(null);
    try {
      await favoritosApi.quitar(id);
    } catch (err) {
      console.error("Error al quitar el favorito:", err);
      window.alert(t("favoritos.toggleError"));
      lista.recargar();
    }
  };

  const vacia = !lista.cargando && !lista.error && lista.items.length === 0;

  return (
    <div className="bg-background text-on-surface font-sans min-h-screen flex">
      <Sidebar isStaff={isStaff} hasAccess onLogout={onLogoutClick} />

      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        {/* BARRA SUPERIOR */}
        <header className="fixed top-0 right-0 left-0 md:left-64 z-50 bg-surface/70 backdrop-blur-xl border-b border-outline-variant/30 transition-all duration-300">
          <div className="flex justify-end items-center px-gutter max-w-container-max mx-auto h-20">
            <button
              onClick={carrito.abrir}
              aria-label={t("common.cart")}
              className="text-on-surface-variant hover:text-primary transition-colors p-2"
            >
              <span className="material-symbols-outlined">shopping_cart</span>
            </button>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-grow pt-24 pb-16 px-gutter md:px-16 max-w-container-max mx-auto w-full flex flex-col gap-6">
          <div className="border-b border-outline-variant/20 pb-4">
            <h1 className="text-2xl font-bold text-on-surface">{t("favoritos.title")}</h1>
            <p className="text-on-surface-variant text-sm mt-1">{t("favoritos.subtitle")}</p>
          </div>

          {lista.cargando && <ProductGridSkeleton />}

          {lista.error && (
            <div className="p-4 bg-error/20 border border-error/50 rounded-md text-on-error-container text-center">
              {t("favoritos.loadError")}
            </div>
          )}

          {vacia && (
            <div className="p-10 text-center flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-[40px] text-outline">favorite</span>
              <p className="text-on-surface-variant">{t("favoritos.empty")}</p>
              <Link to="/" className="text-primary font-semibold hover:underline no-underline">
                {t("favoritos.emptyCta")}
              </Link>
            </div>
          )}

          {lista.items.length > 0 && (
            <ProductGrid
              productos={lista.items}
              hasAccess
              purchasedIds={purchasedIds}
              favoritoIds={favoritoIds}
              onSelectProducto={setSeleccionado}
              onAddToCart={carrito.agregar}
              onGoToLibrary={() => navigate("/biblioteca")}
              onToggleFavorito={quitar}
            />
          )}

          {lista.cargandoMas && <ProductGridSkeleton />}
          <InfiniteScrollSentinel
            onVisible={lista.cargarMas}
            disabled={!lista.hayMas || lista.cargando || lista.cargandoMas}
          />
        </main>

        {/* FOOTER */}
        <footer className="bg-background w-full py-16 border-t border-outline-variant/20 mt-auto">
          <div className="flex flex-col md:flex-row justify-between items-center px-gutter max-w-container-max mx-auto gap-4">
            <div className="text-[24px] font-bold text-primary opacity-50">{t("common.appName")}</div>
            <div className="text-on-surface-variant text-sm">{t("home.footerRights")}</div>
          </div>
        </footer>
      </div>

      <CartDrawer isOpen={carrito.abierto} onClose={carrito.cerrar} refreshKey={carrito.refreshKey} />

      <ProductDetailsModal
        producto={seleccionado}
        hasAccess
        onClose={() => setSeleccionado(null)}
        onAddToCart={carrito.agregar}
        isFavorito
        onToggleFavorito={quitar}
      />
    </div>
  );
};
