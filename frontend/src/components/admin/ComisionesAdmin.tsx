import React, { useState } from "react";
import { SolicitudesComisionesTable } from "./SolicitudesComisionesTable";
import { PreciosComisionesTable } from "./PreciosComisionesTable";

type SubVista = "solicitudes" | "precios";

export const ComisionesAdmin: React.FC = () => {
  const [subVista, setSubVista] = useState<SubVista>("solicitudes");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-on-surface mb-1">Comisiones</h1>
        <p className="text-on-surface-variant">
          Gestiona las solicitudes de Motion y Modelo Nuevo, y los precios de cada tabla.
        </p>
      </div>

      <div className="inline-flex items-center gap-1 p-1 mb-6 rounded-lg bg-surface-container-high/60 border border-outline-variant/30">
        <button
          onClick={() => setSubVista("solicitudes")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${
            subVista === "solicitudes"
              ? "bg-primary-container text-on-primary-fixed"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">inbox</span>
          Solicitudes
        </button>
        <button
          onClick={() => setSubVista("precios")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${
            subVista === "precios"
              ? "bg-primary-container text-on-primary-fixed"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">sell</span>
          Precios
        </button>
      </div>

      {subVista === "solicitudes" ? <SolicitudesComisionesTable /> : <PreciosComisionesTable />}
    </div>
  );
};
