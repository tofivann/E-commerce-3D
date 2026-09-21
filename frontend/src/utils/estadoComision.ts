import type { EstadoComision } from "../api/comisiones.api";

// Tema visual por estado, reutilizado por toda tarjeta de comisión (cliente y
// admin) para que el color signifique lo mismo en todos lados. Usa los
// mismos tokens de color de la paleta "Mimi Pastel" (index.css) que ya usa
// el resto de la app — primary=rosa, secondary=morado, error=rojo — en vez
// de inventar colores nuevos fuera del sistema de diseño.
//
// SOLICITADO ya no es un estado de trabajo visible: en cuanto se confirma el
// pago pasa solo a EN_PROCESO (ver custom_orders/services.py en el backend),
// así que solo puede verse, muy brevemente, mientras el pago se está
// confirmando — ComisionCard lo trata como un estado neutral de "espera" en
// vez de como una tarjeta "en cola" con su propio color.
interface TemaEstado {
  cardBg: string;
  cardBorder: string;
  badgeBg: string;
  badgeText: string;
  icon: string;
}

export const TEMA_ESTADO: Record<EstadoComision, TemaEstado> = {
  SOLICITADO: {
    cardBg: "bg-surface-container-low",
    cardBorder: "border-outline-variant/30",
    badgeBg: "bg-surface-container-high",
    badgeText: "text-on-surface-variant",
    icon: "hourglass_empty",
  },
  EN_PROCESO: {
    cardBg: "bg-primary-container/15",
    cardBorder: "border-primary/40",
    badgeBg: "bg-primary-container",
    badgeText: "text-on-primary-fixed",
    icon: "auto_awesome",
  },
  COMPLETADO: {
    cardBg: "bg-secondary-container/30",
    cardBorder: "border-secondary/50",
    badgeBg: "bg-secondary",
    badgeText: "text-on-secondary-container",
    icon: "check_circle",
  },
  CANCELADO: {
    cardBg: "bg-error/10",
    cardBorder: "border-error/40",
    badgeBg: "bg-error/20",
    badgeText: "text-on-error-container",
    icon: "cancel",
  },
};

// Clave i18n de la etiqueta visible de un estado. SOLICITADO no se muestra
// como "Solicitado"/"En cola": solo puede verse mientras el pago se confirma,
// así que su etiqueta es "Confirmando pago".
export function claveEtiquetaEstado(estado: EstadoComision): string {
  return estado === "SOLICITADO" ? "comisiones.confirmingPayment" : `estado.${estado}`;
}
