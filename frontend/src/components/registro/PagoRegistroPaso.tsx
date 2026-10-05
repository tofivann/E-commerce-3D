import React from "react";
import { useTranslation } from "react-i18next";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { Button } from "../ui/Button";
import { PrecioSuscripcion } from "../ui/PrecioSuscripcion";

interface PagoRegistroPasoProps {
  email: string;
  ocupado: boolean;
  onPagarConTarjeta: () => void;
  // Crea la cuenta y devuelve el id de la orden de PayPal que hay que aprobar.
  onCrearOrdenPayPal: () => Promise<string>;
  onPayPalAprobado: (paypalOrderId: string) => Promise<void>;
  onErrorPayPal: () => void;
}

// Paso 3 del registro: con el correo ya verificado, se elige cómo pagar. La
// cuenta se crea en el momento de pulsar una de las dos opciones.
export const PagoRegistroPaso: React.FC<PagoRegistroPasoProps> = ({
  email,
  ocupado,
  onPagarConTarjeta,
  onCrearOrdenPayPal,
  onPayPalAprobado,
  onErrorPayPal,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm text-on-surface-variant min-w-0">
        <span className="material-symbols-outlined text-primary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
          verified
        </span>
        <span className="min-w-0 break-words">
          <span className="font-semibold text-on-surface">{t("register.emailVerified")}:</span> {email}
        </span>
      </p>

      <div>
        <h2 className="text-lg font-bold text-on-surface">{t("register.payTitle")}</h2>
        <PrecioSuscripcion className="text-primary mt-1" />
      </div>

      <Button type="button" onClick={onPagarConTarjeta} loading={ocupado} icon="credit_card" className="w-full">
        {t("register.payWithCard")}
      </Button>

      <div className="relative flex py-1 items-center">
        <div className="grow border-t border-outline-variant/50"></div>
        <span className="shrink-0 mx-4 text-on-surface-variant font-mono text-xs">{t("common.orPayWith")}</span>
        <div className="grow border-t border-outline-variant/50"></div>
      </div>

      <PayPalButtons
        style={{ layout: "horizontal", height: 45 }}
        disabled={ocupado}
        createOrder={onCrearOrdenPayPal}
        onApprove={(data) => onPayPalAprobado(data.orderID)}
        onError={onErrorPayPal}
      />
    </div>
  );
};
