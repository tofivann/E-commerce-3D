import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePerfil } from "../../hooks/usePerfil";
import { Monedas } from "../ui/Monedas";

// El saldo de monedas del usuario, como botón que lleva a su perfil (donde
// está el historial). En escritorio va en la cabecera (AppLayout); en móvil,
// donde ahí no cabe sin aplastar el buscador, va en el menú (Sidebar).
export const SaldoMonedas: React.FC = () => {
  const { t } = useTranslation();
  const { perfil } = usePerfil();
  if (!perfil) return null;

  return (
    <Link
      to="/perfil"
      aria-label={t("monedas.saldoAria", { count: perfil.saldo_monedas })}
      className="no-underline inline-flex rounded-full border border-outline-variant/50 px-3 py-1 text-sm text-primary hover:border-primary/60 hover:bg-primary/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Monedas cantidad={perfil.saldo_monedas} />
    </Link>
  );
};
