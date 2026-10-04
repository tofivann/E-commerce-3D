import { useEffect, useState } from "react";
import { bibliotecaApi } from "../api/biblioteca.api";

const SIN_COMPRAS: ReadonlySet<number> = new Set();

// Ids de los productos que el usuario ya compró (su biblioteca digital): el
// catálogo los marca "En tu biblioteca" en vez de ofrecerlos al carrito.
// `habilitado` = hay sesión iniciada.
export function useComprasIds(habilitado: boolean): ReadonlySet<number> {
  const [ids, setIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!habilitado) return;
    let vigente = true;
    bibliotecaApi
      .listar()
      .then((compras) => {
        if (!vigente) return;
        setIds(
          new Set(
            compras.map((compra) => compra.producto.id).filter((id): id is number => typeof id === "number")
          )
        );
      })
      .catch((err) => console.error("Error al cargar la biblioteca:", err));
    return () => {
      vigente = false;
    };
  }, [habilitado]);

  return habilitado ? ids : SIN_COMPRAS;
}
