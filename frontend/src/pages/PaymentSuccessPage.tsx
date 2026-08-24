import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Orden } from "../api/carrito.api";
import { carritoApi } from "../api/carrito.api";
import { descargarCompra } from "../api/biblioteca.api";
import type { CompraDigital } from "../api/biblioteca.api";

const MAX_INTENTOS = 10; // ~15s de espera al webhook antes de rendirnos
const INTERVALO_MS = 1500;

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [orden, setOrden] = useState<Orden | null>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "expirado" | "error">("cargando");
  const [descargandoId, setDescargandoId] = useState<number | null>(null);
  const intentos = useRef(0);

  useEffect(() => {
    if (!sessionId) {
      setEstado("error");
      return;
    }

    let cancelado = false;

    const consultar = async () => {
      try {
        const data = await carritoApi.obtenerOrdenPorSesion(sessionId);
        if (cancelado) return;
        setOrden(data);

        if (data.estado_pago === "COMPLETADO") {
          setEstado("listo");
          return;
        }

        intentos.current += 1;
        if (intentos.current >= MAX_INTENTOS) {
          setEstado("expirado");
          return;
        }
        setTimeout(consultar, INTERVALO_MS);
      } catch (err) {
        console.error("Error al consultar la orden:", err);
        if (!cancelado) setEstado("error");
      }
    };

    consultar();
    return () => {
      cancelado = true;
    };
  }, [sessionId]);

  const handleDescargar = async (compra: CompraDigital) => {
    setDescargandoId(compra.id);
    try {
      await descargarCompra(compra);
    } catch (err) {
      console.error("Error al descargar el archivo:", err);
      window.alert("No se pudo descargar el archivo. Inténtalo de nuevo.");
    } finally {
      setDescargandoId(null);
    }
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col items-center justify-center p-6 md:p-16 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-container/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary-container/15 rounded-full blur-[120px] pointer-events-none" />

      <main className="w-full max-w-[800px] z-10">
        {!sessionId && (
          <div className="glass-panel rounded-xl p-10 text-center">
            <p className="text-on-surface-variant mb-4">
              No encontramos ninguna sesión de pago para mostrar.
            </p>
            <Link to="/" className="text-primary-fixed-dim font-semibold hover:underline no-underline">
              Volver al catálogo →
            </Link>
          </div>
        )}

        {sessionId && estado === "cargando" && (
          <div className="text-center flex flex-col items-center gap-4 py-16">
            <div className="w-16 h-16 rounded-full border-4 border-outline-variant/40 border-t-primary-container animate-spin" />
            <p className="text-on-surface-variant">Confirmando tu pago con Stripe...</p>
          </div>
        )}

        {sessionId && estado === "expirado" && (
          <div className="glass-panel rounded-xl p-10 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[48px] text-tertiary-container">hourglass_top</span>
            <p className="text-on-surface">
              El pago está tardando más de lo normal en confirmarse.
            </p>
            <p className="text-on-surface-variant text-sm max-w-md">
              Esto puede pasar si el webhook de Stripe todavía no llega. Revisa tu{" "}
              <Link to="/biblioteca" className="text-primary-fixed-dim hover:underline no-underline">
                biblioteca digital
              </Link>{" "}
              en unos segundos.
            </p>
          </div>
        )}

        {sessionId && estado === "error" && (
          <div className="glass-panel rounded-xl p-10 text-center text-on-error-container">
            No se pudo consultar el estado de tu compra. Si el cobro se realizó, el modelo
            aparecerá en tu biblioteca digital en breve.
          </div>
        )}

        {estado === "listo" && orden && (
          <>
            {/* Encabezado de estado */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary-container/15 border border-primary-container/40 mb-4">
                <span className="material-symbols-outlined text-[64px] text-primary-fixed-dim">
                  check_circle
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-2">
                ¡Pago Completado!
              </h1>
              <p className="font-mono text-on-surface-variant flex items-center justify-center gap-2 text-sm">
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                Orden: <span className="text-primary-fixed-dim">{orden.codigo_orden}</span>
              </p>
            </div>

            {/* Tarjeta de descargas */}
            <div className="glass-panel rounded-xl p-6 md:p-8 mb-6">
              <div className="mb-6 pb-6 border-b border-outline-variant/30 text-center">
                <h2 className="text-xl font-bold text-on-surface mb-1">Gracias por tu compra</h2>
                <p className="text-on-surface-variant">
                  Tus modelos 3D ya están disponibles. Este archivo fue añadido permanentemente a
                  tu{" "}
                  <Link to="/biblioteca" className="text-primary-fixed-dim hover:underline no-underline">
                    biblioteca digital
                  </Link>
                  .
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {orden.compras_digitales.map((compra) => (
                  <div
                    key={compra.id}
                    className="flex flex-col md:flex-row items-center gap-4 bg-surface-container-low rounded-lg p-3 border border-outline-variant/30"
                  >
                    <div className="w-full md:w-28 h-28 rounded-md overflow-hidden shrink-0 relative bg-surface-container-lowest">
                      {typeof compra.producto.imagen_previa === "string" && compra.producto.imagen_previa ? (
                        <img
                          src={compra.producto.imagen_previa}
                          alt={compra.producto.titulo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-outline">
                          <span className="material-symbols-outlined">deployed_code</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-surface/85 backdrop-blur-md px-2 py-1 rounded text-primary-fixed-dim font-mono text-[10px] border border-outline-variant/40">
                        .{compra.producto.formato_archivo || "3D"}
                      </div>
                    </div>
                    <div className="flex-1 w-full">
                      <h3 className="font-bold text-on-surface mb-3">{compra.producto.titulo}</h3>
                      <button
                        onClick={() => handleDescargar(compra)}
                        disabled={descargandoId === compra.id}
                        className="w-full md:w-auto px-6 py-2.5 rounded-lg bg-primary-container text-on-primary-fixed btn-glow-inner font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[20px]">cloud_download</span>
                        {descargandoId === compra.id ? "Descargando..." : "Descargar Archivo"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones secundarias */}
            <div className="flex flex-col md:flex-row justify-center gap-3">
              <Link
                to="/"
                className="px-6 py-3 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2 no-underline font-semibold"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                Volver al Marketplace
              </Link>
              <Link
                to="/biblioteca"
                className="px-6 py-3 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2 no-underline font-semibold"
              >
                <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                Ver Mi Biblioteca
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
