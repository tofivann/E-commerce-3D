import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { CompraDigital } from "../../api/biblioteca.api";
import { bibliotecaApi, descargarCompra } from "../../api/biblioteca.api";

const fallbackImage =
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";

export const DigitalLibrary: React.FC = () => {
  const [compras, setCompras] = useState<CompraDigital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descargandoId, setDescargandoId] = useState<number | null>(null);

  useEffect(() => {
    fetchBiblioteca();
  }, []);

  const fetchBiblioteca = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bibliotecaApi.listar();
      setCompras(data);
    } catch (err) {
      console.error("Error al cargar la biblioteca digital:", err);
      setError("No se pudo cargar tu biblioteca digital.");
    } finally {
      setLoading(false);
    }
  };

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
    <div>
      <header className="mb-lg flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface">Mi Biblioteca Digital</h1>
        <p className="text-on-surface-variant max-w-2xl">
          Tu colección permanente de modelos 3D adquiridos, listos para descargar.
        </p>
      </header>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-72 rounded-lg bg-surface-container-low animate-pulse border border-outline-variant/20"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-error/20 border border-error/50 rounded-md text-on-error-container text-center">
          {error}
        </div>
      )}

      {!loading && !error && compras.length === 0 && (
        <div className="glass-panel rounded-xl p-12 flex flex-col items-center gap-3 text-center">
          <span className="material-symbols-outlined text-[48px] text-outline">inventory_2</span>
          <p className="text-on-surface-variant">Aún no has adquirido ningún modelo.</p>
          <Link
            to="/"
            className="text-primary-fixed-dim font-semibold hover:underline no-underline"
          >
            Explorar el catálogo →
          </Link>
        </div>
      )}

      {!loading && !error && compras.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {compras.map((compra) => (
            <div
              key={compra.id}
              className="card-hover bg-surface-container-low rounded-lg border border-outline-variant/30 overflow-hidden flex flex-col h-full"
            >
              <div className="relative h-40 w-full overflow-hidden bg-surface-container-lowest">
                <img
                  src={
                    typeof compra.producto.imagen_previa === "string" && compra.producto.imagen_previa
                      ? compra.producto.imagen_previa
                      : fallbackImage
                  }
                  alt={compra.producto.titulo}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 right-2 bg-surface/85 backdrop-blur text-primary-fixed-dim font-mono text-[10px] px-2 py-1 rounded-full border border-outline-variant/40 uppercase">
                  .{compra.producto.formato_archivo || "3D"}
                </span>
              </div>

              <div className="p-4 flex flex-col flex-1 gap-1">
                <h3 className="font-semibold text-on-surface truncate">{compra.producto.titulo}</h3>
                <p className="text-on-surface-variant text-xs font-mono">
                  Adquirido: {new Date(compra.fecha_adquisicion).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>

                <div className="mt-auto pt-3">
                  <button
                    onClick={() => handleDescargar(compra)}
                    disabled={descargandoId === compra.id}
                    className="w-full py-2 px-4 rounded bg-primary-container text-on-primary-fixed btn-glow-inner font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    {descargandoId === compra.id ? "Descargando..." : "Descargar"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
