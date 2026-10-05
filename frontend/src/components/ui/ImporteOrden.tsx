import React from "react";
import { formatearDinero } from "../../utils/importe";
import { Monedas } from "./Monedas";

interface ImporteOrdenProps {
  // Lo cobrado en dinero (0 si la orden se pagó con monedas).
  total: number | string;
  // Lo cobrado en monedas; null/undefined si se pagó con dinero.
  totalMonedas?: number | null;
  className?: string;
}

// Lo que costó una orden, en lo que se pagó: "$20.00" o "10 monedas". Una
// orden pagada con monedas tiene total 0; sin esto se vería "$0.00".
export const ImporteOrden: React.FC<ImporteOrdenProps> = ({ total, totalMonedas, className = "" }) =>
  totalMonedas != null ? (
    <Monedas cantidad={totalMonedas} formato="largo" className={className} />
  ) : (
    <span className={className}>{formatearDinero(total)}</span>
  );
