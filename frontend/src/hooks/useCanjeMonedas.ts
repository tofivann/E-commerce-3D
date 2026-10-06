import { useCallback, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { carritoApi } from "../api/carrito.api";
import type { MotivoPagoMonedasRechazado } from "../api/monedas.api";
import type { Producto } from "../api/productos.api";
import { perfilStore } from "../stores/perfilStore";
import { usePerfil } from "./usePerfil";

const CLAVE_ERROR: Record<MotivoPagoMonedasRechazado, string> = {
  saldo_insuficiente: "monedas.errorSaldo",
  no_pagable: "monedas.errorNoPagable",
};

// La acción "Canjear" de un producto: lo compra al instante con MimiCoins,
// sin carrito (así se compra en Mimi Gifts). Pide confirmación con
// el saldo a la vista, actualiza el saldo de la cabecera y avisa al que
// llama cuando el producto ya está en la biblioteca. Los errores se avisan
// igual que "agregar al carrito" (useCarritoDrawer): con un aviso simple.
export function useCanjeMonedas(onCanjeado: (producto: Producto) => void) {
  const { t } = useTranslation();
  const { perfil } = usePerfil();
  const [canjeandoId, setCanjeandoId] = useState<number | null>(null);
  const saldo = perfil?.saldo_monedas ?? 0;

  const canjear = useCallback(
    async (producto: Producto) => {
      if (!producto.id || producto.precio_monedas == null) return;
      if (producto.precio_monedas > saldo) {
        window.alert(t("monedas.teFaltan", { count: producto.precio_monedas - saldo, saldo }));
        return;
      }
      if (!window.confirm(t("monedas.confirmar", { count: producto.precio_monedas, saldo }))) return;
      setCanjeandoId(producto.id);
      try {
        perfilStore.actualizarSaldo(await carritoApi.canjearMonedas(producto.id));
        onCanjeado(producto);
      } catch (err) {
        console.error("Error al canjear con MimiCoins:", err);
        const motivo = axios.isAxiosError(err) ? (err.response?.data?.motivo as MotivoPagoMonedasRechazado | undefined) : undefined;
        window.alert(t((motivo && CLAVE_ERROR[motivo]) ?? "monedas.errorGenerico"));
        perfilStore.recargar();
      } finally {
        setCanjeandoId(null);
      }
    },
    [onCanjeado, saldo, t]
  );

  return { canjear, canjeandoId };
}
