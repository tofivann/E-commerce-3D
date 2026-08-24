import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProductList } from "../components/products/ProductList";
import { CartDrawer } from "../components/products/CartDrawer";
import { Sidebar } from "../components/layout/Sidebar";
import { carritoApi } from "../api/carrito.api";
import { bibliotecaApi } from "../api/biblioteca.api";
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
  const navigate = useNavigate();

  // El catálogo (precio, botón de compra, buscador) solo se desbloquea para
  // administradores o clientes con suscripción activa — no basta con tener sesión.
  const hasAccess = isLoggedIn && (isStaff || isSubscribed);
  const canSearch = isStaff || isSubscribed;

  // Carga el conteo del carrito al iniciar sesión, sin esperar a que se abra el drawer.
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

  // Carga qué productos ya están en la biblioteca digital del usuario, para
  // que el catálogo los muestre como "En tu biblioteca" en vez de comprables.
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

  return (
    <div className="bg-background text-on-surface font-sans min-h-screen flex">
      {isLoggedIn && <Sidebar isStaff={isStaff} onLogout={onLogoutClick} />}

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
                {/* Buscador: solo admins o suscriptores activos */}
                {canSearch ? (
                  <div className="relative w-full max-w-sm">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar modelos..."
                      className="w-full bg-surface-variant border border-outline-variant rounded-full pl-10 pr-4 py-2.5 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>
                ) : (
                  <span />
                )}

                <button
                  onClick={() => setCartOpen(true)}
                  aria-label="Carrito"
                  className="relative text-on-surface-variant hover:text-primary transition-colors p-2 shrink-0"
                >
                  <span className="material-symbols-outlined">shopping_cart</span>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary-container text-on-primary-fixed text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-[32px]">
                    architecture
                  </span>
                  <span className="font-bold text-[24px] tracking-tighter text-primary">
                    MimiMMDart
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={onLoginClick}
                    className="text-on-surface-variant hover:text-primary transition-colors px-4 py-2"
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={onRegisterClick}
                    className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded px-6 py-2 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95"
                  >
                    Registrarse
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-grow pt-24 pb-16 px-gutter md:px-16 max-w-container-max mx-auto w-full flex flex-col gap-16">
          {/* Banner Hero */}
          <section className="relative w-full rounded-xl overflow-hidden glass-panel min-h-100 flex items-end justify-center text-center mt-8">
            <img
              src={heroImage}
              alt="MimiMMDart — comisiona modelos 3D pulidos y listos para MikuMikuDance"
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent"></div>
            {!isLoggedIn && (
              <div className="relative z-10 flex flex-col items-center gap-4 max-w-xl p-8">
                <button
                  onClick={onRegisterClick}
                  className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded px-8 py-3 text-lg font-bold hover:bg-primary-fixed-dim transition-all active:scale-95 shadow-[0_4px_18px_rgba(232,137,174,0.45)]"
                >
                  Crear Cuenta Ahora
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
              searchQuery={canSearch ? searchQuery : ""}
            />
          </div>
        </main>

        {/* FOOTER */}
        <footer className="bg-background w-full py-16 border-t border-outline-variant/20 mt-auto">
          <div className="flex flex-col md:flex-row justify-between items-center px-gutter max-w-container-max mx-auto gap-4">
            <div className="text-[24px] font-bold text-primary opacity-50">MimiMMDart</div>
            <div className="text-on-surface-variant text-sm">© 2026 MimiMMDart.</div>
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
    </div>
  );
};
