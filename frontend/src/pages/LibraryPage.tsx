import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { DigitalLibrary } from "../components/products/DigitalLibrary";
import { ComisionesLibrary } from "../components/comisiones/ComisionesLibrary";
import { AppLayout } from "../components/layout/AppLayout";
import { SearchInput } from "../components/products/SearchInput";

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
  // Un solo buscador para las dos pestañas: filtra la que esté abierta.
  const [busqueda, setBusqueda] = useState("");

  // Misma regla de acceso que en HomePage: admins o suscriptores activos.
  const hasAccess = isStaff || isSubscribed;

  return (
    <AppLayout
      isStaff={isStaff}
      hasAccess={hasAccess}
      onLogout={onLogoutClick}
      barra={
        <SearchInput
          value={busqueda}
          onChange={setBusqueda}
          placeholder={t("library.searchPlaceholder")}
          className="w-full max-w-40 sm:max-w-xs md:max-w-sm"
        />
      }
    >
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

      {pestana === "productos" ? <DigitalLibrary busqueda={busqueda} /> : <ComisionesLibrary busqueda={busqueda} />}
    </AppLayout>
  );
};
