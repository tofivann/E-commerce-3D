import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminView } from "../components/admin/AdminSidebar";
import { AdminSidebar } from "../components/admin/AdminSidebar";
import { ProductAdminGrid } from "../components/products/ProductAdminGrid";
import { ProductAdminTable } from "../components/products/ProductAdminTable";
import { UserAdminTable } from "../components/users/UserAdminTable";
import { ChatPanel } from "../components/chat/ChatPanel";
import { ComisionesAdmin } from "../components/admin/ComisionesAdmin";
import { CategoriasTable } from "../components/admin/CategoriasTable";

type AjustesEntidad = "productos" | "categorias" | "usuarios";

interface AdminPageProps {
  onLogout: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onLogout }) => {
  const { t } = useTranslation();
  const [view, setView] = useState<AdminView>("catalogo");
  const [entidad, setEntidad] = useState<AjustesEntidad>("productos");

  return (
    <div className="bg-background min-h-screen flex">
      <AdminSidebar activeView={view} onSelectView={setView} onLogout={onLogout} />

      <main className="flex-1 md:ml-64 pt-20 pb-6 px-6 md:pt-10 md:pb-10 md:px-10 max-w-container-max mx-auto w-full">
        {view === "catalogo" && <ProductAdminGrid />}

        {view === "chat" && <ChatPanel isAdmin={true} />}

        {view === "comisiones" && <ComisionesAdmin />}

        {view === "ajustes" && (
          <div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-on-surface mb-1">{t("adminPage.settingsTitle")}</h1>
              <p className="text-on-surface-variant">
                {t("adminPage.settingsSubtitle")}
              </p>
            </div>

            <div className="inline-flex items-center gap-1 p-1 mb-6 rounded-lg bg-surface-container-high/60 border border-outline-variant/30">
              <button
                onClick={() => setEntidad("productos")}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${
                  entidad === "productos"
                    ? "bg-primary-container text-on-primary-fixed"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                {t("adminPage.products")}
              </button>
              <button
                onClick={() => setEntidad("categorias")}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${
                  entidad === "categorias"
                    ? "bg-primary-container text-on-primary-fixed"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">sell</span>
                {t("adminPage.categories")}
              </button>
              <button
                onClick={() => setEntidad("usuarios")}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${
                  entidad === "usuarios"
                    ? "bg-primary-container text-on-primary-fixed"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">group</span>
                {t("adminPage.users")}
              </button>
            </div>

            {entidad === "productos" && <ProductAdminTable />}
            {entidad === "categorias" && <CategoriasTable />}
            {entidad === "usuarios" && <UserAdminTable />}
          </div>
        )}
      </main>
    </div>
  );
};