import React, { useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import type { MotivoPagoMonedasRechazado } from "../../api/monedas.api";
import { usePerfil } from "../../hooks/usePerfil";
import { perfilStore } from "../../stores/perfilStore";
import { IconoMoneda } from "./Monedas";

interface PagarConMonedasProps {
  // Lo que cuesta en monedas, o null si esto no se puede pagar con monedas.
  precio: number | null;
  // Hace el pago en el servidor y devuelve el saldo que le queda al usuario.
  onPagar: () => Promise<number>;
  // Se llama después de un pago correcto (cerrar el panel, ir a la biblioteca…).
  onPagado: () => void;
  deshabilitado?: boolean;
  // Se muestra en lugar del botón cuando `precio` es null.
  textoNoDisponible?: string;
}

const CLAVE_ERROR: Record<MotivoPagoMonedasRechazado, string> = {
  saldo_insuficiente: "monedas.errorSaldo",
  no_pagable: "monedas.errorNoPagable",
};

// Botón "Pagar con N monedas", igual en el carrito y en las solicitudes de
// comisión. Una compra se paga entera con monedas o entera con dinero: por
// eso solo se activa si el saldo alcanza para todo. Pide confirmación (no
// hay pasarela que muestre el total antes de cobrar) y, al pagar, pone el
// saldo nuevo en la cabecera.
export const PagarConMonedas: React.FC<PagarConMonedasProps> = ({
  precio,
  onPagar,
  onPagado,
  deshabilitado = false,
  textoNoDisponible,
}) => {
  const { t } = useTranslation();
  const { perfil } = usePerfil();
  const [pagando, setPagando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (precio === null) {
    return textoNoDisponible ? <p className="text-xs text-on-surface-variant text-center">{textoNoDisponible}</p> : null;
  }

  const saldo = perfil?.saldo_monedas ?? 0;
  const faltan = Math.max(0, precio - saldo);

  const pagar = async () => {
    setError(null);
    if (!window.confirm(t("monedas.confirmar", { count: precio, saldo }))) return;
    setPagando(true);
    try {
      perfilStore.actualizarSaldo(await onPagar());
      onPagado();
    } catch (err) {
      console.error("Error al pagar con monedas:", err);
      const motivo = axios.isAxiosError(err) ? (err.response?.data?.motivo as MotivoPagoMonedasRechazado | undefined) : undefined;
      setError(t((motivo && CLAVE_ERROR[motivo]) ?? "monedas.errorGenerico"));
      // El saldo que se ve puede estar viejo (otra pestaña, un ajuste): se relee.
      perfilStore.recargar();
    } finally {
      setPagando(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={pagar}
        disabled={deshabilitado || pagando || faltan > 0}
        className="w-full border border-primary/60 text-primary rounded-lg py-3 font-bold hover:bg-primary/10 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
      >
        <IconoMoneda />
        {pagando ? t("monedas.pagando") : t("monedas.pagarCon", { count: precio })}
      </button>
      <p className={`text-xs text-center ${faltan > 0 ? "text-on-surface-variant" : "text-primary"}`}>
        {faltan > 0 ? t("monedas.teFaltan", { count: faltan, saldo }) : t("monedas.tienes", { count: saldo })}
      </p>
      {error && (
        <p role="alert" className="text-xs text-center text-error">
          {error}
        </p>
      )}
    </div>
  );
};
