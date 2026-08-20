import React, { useState } from "react";
import type { AdminView } from "../components/admin/AdminSidebar";
import { AdminSidebar } from "../components/admin/AdminSidebar";
import { ProductAdminGrid } from "../components/products/ProductAdminGrid";
import { ProductAdminTable } from "../components/products/ProductAdminTable";
import { UserAdminTable } from "../components/users/UserAdminTable";

type AjustesEntidad = "productos" | "usuarios";

interface AdminPageProps {
  onLogout: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onLogout }) => {
  const [view, setView] = useState<AdminView>("catalogo");
  const [entidad, setEntidad] = useState<AjustesEntidad>("productos");

  return (
    <div className="bg-background min-h-screen flex">
      <AdminSidebar activeView={view} onSelectView={setView} onLogout={onLogout} />

      <main className="flex-1 md:ml-64 p-6 md:p-10 max-w-container-max mx-auto w-full">
        {view === "catalogo" && <ProductAdminGrid />}

        {view === "ajustes" && (
          <div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-on-surface mb-1">Ajustes</h1>
              <p className="text-on-surface-variant">
                Elige qué quieres administrar: los productos del catálogo o las cuentas de usuario.
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
                Productos
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
                Usuarios
              </button>
            </div>

            {entidad === "productos" ? <ProductAdminTable /> : <UserAdminTable />}
          </div>
        )}
      </main>
    </div>
  );
};
