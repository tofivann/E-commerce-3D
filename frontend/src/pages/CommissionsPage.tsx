import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { CartDrawer } from "../components/products/CartDrawer";
import { ComisionMotionForm } from "../components/comisiones/ComisionMotionForm";
import { ComisionModeloForm } from "../components/comisiones/ComisionModeloForm";
import { MisComisionesList } from "../components/comisiones/MisComisionesList";
import { carritoApi } from "../api/carrito.api";

interface CommissionsPageProps {
  isStaff?: boolean;
  isSubscribed?: boolean;
  onLogoutClick: () => void;
}

type TipoComision = "motion" | "modelo";

export const CommissionsPage: React.FC<CommissionsPageProps> = ({
  isStaff = false,
  isSubscribed = false,
  onLogoutClick,
}) => {
  const [cartOpen, setCartOpen] = useState(false);
  const [tipo, setTipo] = useState<TipoComision>("motion");
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [confirmandoPago, setConfirmandoPago] = useState(Boolean(sessionId));

  const hasAccess = isStaff || isSubscribed;

  // Si volvemos de Stripe con ?session_id=, esperamos brevemente a que el
  // webhook confirme el pago antes de mostrar la lista con normalidad.
  useEffect(() => {
    if (!sessionId) return;
    let cancelado = false;
    let intentos = 0;

    const consultar = async () => {
      try {
        const orden = await carritoApi.obtenerOrdenPorSesion(sessionId);
        if (cancelado) return;
        if (orden.estado_pago === "COMPLETADO" || intentos >= 8) {
          setConfirmandoPago(false);
          setRefreshKey((k) => k + 1);
          return;
        }
        intentos += 1;
        setTimeout(consultar, 1500);
      } catch (err) {
        console.error("Error al confirmar el pago de la comisión:", err);
        if (!cancelado) setConfirmandoPago(false);
      }
    };
    consultar();
    return () => {
      cancelado = true;
    };
  }, [sessionId]);

  return (
    <div className="bg-background text-on-surface font-sans min-h-screen flex">
      <Sidebar isStaff={isStaff} hasAccess={hasAccess} onLogout={onLogoutClick} />

      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        {/* BARRA SUPERIOR */}
        <header className="fixed top-0 right-0 left-0 md:left-64 z-50 bg-surface/70 backdrop-blur-xl border-b border-outline-variant/30 transition-all duration-300">
          <div className="flex justify-end items-center px-gutter max-w-container-max mx-auto h-20">
            <button
              onClick={() => setCartOpen(true)}
              aria-label="Carrito"
              className="text-on-surface-variant hover:text-primary transition-colors p-2"
            >
              <span className="material-symbols-outlined">shopping_cart</span>
            </button>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-grow pt-24 pb-16 px-gutter md:px-16 max-w-container-max mx-auto w-full flex flex-col gap-8">
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-4xl font-bold text-on-surface">Comisiones</h1>
            <p className="text-on-surface-variant max-w-2xl">
              Pide una coreografía de motion para tu personaje, o un modelo 3D nuevo que aún no está en la tienda.
            </p>
          </header>

          {confirmandoPago && (
            <div className="bg-primary-container/15 border border-primary-container/40 text-on-surface p-4 rounded-lg flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-outline-variant/40 border-t-primary-container animate-spin shrink-0" />
              Confirmando tu pago con Stripe...
            </div>
          )}

          {!formularioAbierto && (
            <button
              onClick={() => setFormularioAbierto(true)}
              className="self-start bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-3 px-6 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Solicitar Comisión
            </button>
          )}

          {formularioAbierto && (
            <section className="glass-panel rounded-xl p-6 md:p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-surface-container-high/60 border border-outline-variant/30">
                  <button
                    onClick={() => setTipo("motion")}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${
                      tipo === "motion"
                        ? "bg-primary-container text-on-primary-fixed"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">music_note</span>
                    Motion
                  </button>
                  <button
                    onClick={() => setTipo("modelo")}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${
                      tipo === "modelo"
                        ? "bg-primary-container text-on-primary-fixed"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">deployed_code</span>
                    Modelo Nuevo
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setFormularioAbierto(false)}
                  className="text-on-surface-variant hover:text-primary transition-colors"
                  aria-label="Cerrar"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {tipo === "motion" ? <ComisionMotionForm /> : <ComisionModeloForm />}
            </section>
          )}

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-on-surface">Mis Comisiones</h2>
            <MisComisionesList refreshKey={refreshKey} />
          </section>
        </main>
      </div>

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};
