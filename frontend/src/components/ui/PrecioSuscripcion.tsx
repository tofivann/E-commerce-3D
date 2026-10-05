import React from "react";
import { useTranslation } from "react-i18next";
import { usePrecioSuscripcion } from "../../hooks/usePrecioSuscripcion";
import { formatearDinero } from "../../utils/importe";

interface PrecioSuscripcionProps {
  className?: string;
}

// "Pago único de $5.00 USD": lo que cuesta activar una cuenta. El único
// lugar donde se muestra ese precio; lo usan el registro y el aviso de
// cuenta pendiente. Mientras carga ocupa su línea en blanco, para que la
// pantalla no salte cuando llega.
export const PrecioSuscripcion: React.FC<PrecioSuscripcionProps> = ({ className = "" }) => {
  const { t } = useTranslation();
  const precio = usePrecioSuscripcion();

  return (
    <p className={`flex items-center gap-2 font-semibold min-h-6 ${className}`} aria-live="polite">
      {precio && (
        <>
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">sell</span>
          {t("common.oneTimePayment", { precio: formatearDinero(precio.precio), moneda: precio.moneda })}
        </>
      )}
    </p>
  );
};
