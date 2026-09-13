import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { CompraDigital } from "../../api/biblioteca.api";
import { bibliotecaApi, descargarCompra } from "../../api/biblioteca.api";
import { categoriasApi } from "../../api/productos.api";
import type { Categoria } from "../../api/productos.api";
import { CategoryFilter } from "./CategoryFilter";
import { CategoryBadge } from "./CategoryBadge";

const fallbackImage =
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";

export const DigitalLibrary: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [compras, setCompras] = useState<CompraDigital[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descargandoId, setDescargandoId] = useState<number | null>(null);

  const comprasFiltradas = compras.filter(
    (c) => categoriasSeleccionadas.size === 0 || categoriasSeleccionadas.has(c.producto.categoria)
  );

  useEffect(() => {
    fetchBiblioteca();
    categoriasApi
      .listar()
      .then(setCategorias)
      .catch((err) => console.error("Error al cargar categorías:", err));
  }, []);

  const fetchBiblioteca = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bibliotecaApi.listar();
      setCompras(data);
    } catch (err) {
      console.error("Error al cargar la biblioteca digital:", err);
      setError(t("library.loadError"));
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
      window.alert(t("library.downloadError"));
    } finally {
      setDescargandoId(null);
    }
  };

  return (
    <div>
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface">{t("library.title")}</h1>
        <p className="text-on-surface-variant max-w-2xl">
          {t("library.subtitle")}
        </p>
      </header>

      {!loading && !error && compras.length > 0 && (
        <CategoryFilter
          categorias={categorias}
          seleccionadas={categoriasSeleccionadas}
          onChange={setCategoriasSeleccionadas}
          className="mb-6"
        />
      )}

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
          <p className="text-on-surface-variant">{t("library.emptyMessage")}</p>
          <Link
            to="/"
            className="text-primary-fixed-dim font-semibold hover:underline no-underline"
          >
            {t("library.exploreCatalog")}
          </Link>
        </div>
      )}

      {!loading && !error && compras.length > 0 && comprasFiltradas.length === 0 && (
        <div className="p-10 text-center text-on-surface-variant">
          {t("library.noResultsFiltered")}
        </div>
      )}

      {!loading && !error && comprasFiltradas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {comprasFiltradas.map((compra) => (
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
                <CategoryBadge categoria={compra.producto.categoria_detalle} />
                <p className="text-on-surface-variant text-xs font-mono">
                  {t("library.acquired", {
                    date: new Date(compra.fecha_adquisicion).toLocaleDateString(i18n.language, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }),
                  })}
                </p>

                <div className="mt-auto pt-3">
                  <button
                    onClick={() => handleDescargar(compra)}
                    disabled={descargandoId === compra.id}
                    className="w-full py-2 px-4 rounded bg-primary-container text-on-primary-fixed btn-glow-inner font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    {descargandoId === compra.id ? t("library.downloading") : t("library.download")}
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
