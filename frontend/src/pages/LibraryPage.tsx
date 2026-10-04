import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { DigitalLibrary } from "../components/products/DigitalLibrary";
import { ComisionesLibrary } from "../components/comisiones/ComisionesLibrary";
import { AppLayout } from "../components/layout/AppLayout";

interface LibraryPageProps {
  isStaff?: boolean;
  isSubscribed?: boolean;
  onLogoutClick: () => void;
}

type PestanaBiblioteca = "productos" | "comisiones";

export const LibraryPage: React.FC<LibraryPageProps> = ({
  isStaff = false,
  isSubscribed = false,
  onLogoutClick,
}) => {
  const { t } = useTranslation();
  const [pestana, setPestana] = useState<PestanaBiblioteca>("productos");

  // Misma regla de acceso que en HomePage: admins o suscriptores activos.
  const hasAccess = isStaff || isSubscribed;

  return (
    <AppLayout isStaff={isStaff} hasAccess={hasAccess} onLogout={onLogoutClick}>
      <div className="inline-flex items-center gap-1 p-1 mb-6 rounded-lg bg-surface-container-high/60 border border-outline-variant/30">
        <button
          onClick={() => setPestana("productos")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${
            pestana === "productos"
              ? "bg-primary-container text-on-primary-fixed"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">inventory_2</span>
          {t("library.products")}
        </button>
        <button
          onClick={() => setPestana("comisiones")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${
            pestana === "comisiones"
              ? "bg-primary-container text-on-primary-fixed"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">design_services</span>
          {t("library.commissions")}
        </button>
      </div>

      {pestana === "productos" ? <DigitalLibrary /> : <ComisionesLibrary />}
    </AppLayout>
  );
};
