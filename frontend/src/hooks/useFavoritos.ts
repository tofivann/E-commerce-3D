import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { favoritosApi } from "../api/favoritos.api";
import type { Producto } from "../api/productos.api";

const SIN_FAVORITOS: ReadonlySet<number> = new Set();

// Ids de los productos favoritos del usuario y la acción de marcar/desmarcar,
// para las pantallas que muestran el catálogo. `habilitado` = el usuario
// tiene acceso al catálogo (sin él no hay favoritos y no se pide nada).
export function useFavoritos(habilitado: boolean) {
  const { t } = useTranslation();
  const [ids, setIds] = useState<Set<number>>(new Set());
  // Productos con una petición en vuelo: un segundo clic sobre el mismo
  // corazón se ignora hasta que el servidor responda.
  const enCurso = useRef(new Set<number>());

  useEffect(() => {
    if (!habilitado) return;
    let vigente = true;
    favoritosApi
      .listarIds()
      .then((lista) => {
        if (vigente) setIds(new Set(lista));
      })
      .catch((err) => console.error("Error al cargar los favoritos:", err));
    return () => {
      vigente = false;
    };
  }, [habilitado]);

  const alternar = useCallback(
    async (producto: Producto) => {
      const id = producto.id;
      if (typeof id !== "number" || enCurso.current.has(id)) return;
      enCurso.current.add(id);

      const eraFavorito = ids.has(id);
      const marcar = (favorito: boolean) =>
        setIds((actuales) => {
          const siguientes = new Set(actuales);
          if (favorito) siguientes.add(id);
          else siguientes.delete(id);
          return siguientes;
        });

      // Optimista: el corazón cambia al instante y se revierte si falla.
      marcar(!eraFavorito);
      try {
        if (eraFavorito) await favoritosApi.quitar(id);
        else await favoritosApi.agregar(id);
      } catch (err) {
        console.error("Error al cambiar el favorito:", err);
        marcar(eraFavorito);
        window.alert(t("favoritos.toggleError"));
      } finally {
        enCurso.current.delete(id);
      }
    },
    [ids, t]
  );

  return { ids: habilitado ? ids : SIN_FAVORITOS, alternar };
}
