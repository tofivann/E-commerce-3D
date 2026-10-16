import React, { useEffect, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { escenaStore } from "./escenaStore";

// Mientras dura el "cielo de deseos" (la estrella del pelo de Mimi) la
// interfaz se desvanece y solo queda este botón arriba, centrado, como en el
// kit: "Volver al atelier ✦". Escape hace lo mismo. Si no se pulsa, el deseo
// termina solo a los ~22 s y la interfaz vuelve.
export const BotonVolverDeseo: React.FC = () => {
  const { t } = useTranslation();
  const { deseo } = useSyncExternalStore(escenaStore.suscribir, escenaStore.leer);

  useEffect(() => {
    if (!deseo) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") escenaStore.volverDelDeseo();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [deseo]);

  if (!deseo) return null;
  return (
    <button
      type="button"
      onClick={escenaStore.volverDelDeseo}
      className="fixed left-1/2 top-[22px] z-[45] -translate-x-1/2 rounded-full border border-[#d4a1ab] bg-[#f2ccdfed] px-4 py-2 text-[13px] font-semibold text-[#76476e] shadow-[0_3px_18px_#21152f44] transition-colors hover:bg-[#f7dce9]"
    >
      {t("escena.volverDelDeseo")}
    </button>
  );
};
