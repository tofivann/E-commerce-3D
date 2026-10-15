import React from "react";
import { useTranslation } from "react-i18next";
import { IconoConejo } from "../ui/IconosKit";

interface HojaSeccionProps {
  // Línea pequeña en mayúsculas sobre el título; por defecto, la marca.
  eyebrow?: React.ReactNode;
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  // "hero" solo para la portada: título más grande.
  tamano?: "hero" | "seccion";
  // Lo que va debajo del subtítulo (botones, saldo, estado vacío…).
  children?: React.ReactNode;
}

// Primera pantalla de cada sección, al estilo del kit: la escena pintada con
// Mimi y, sobre ella, una hoja de papel inclinada con el título. El
// contenido (la bandeja) viene después, al hacer scroll. En móvil deja hueco
// arriba para que Mimi se vea antes que la hoja.
export const HojaSeccion: React.FC<HojaSeccionProps> = ({ eyebrow, titulo, subtitulo, tamano = "seccion", children }) => {
  const { t } = useTranslation();
  const tituloClase =
    tamano === "hero"
      ? "text-[39px] tracking-[-1.8px] md:text-[clamp(38px,3.6vw,58px)] md:tracking-[-2.4px]"
      : "text-[34px] tracking-[-1.4px] md:text-[clamp(34px,3vw,48px)]";

  return (
    <section className="pt-[56svh] md:pt-8 md:min-h-[calc(100svh-125px)]">
      <div className="papel-kit w-full md:w-[54%] md:max-w-[680px] -rotate-[0.4deg] p-6 sm:p-8">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[1.8px] text-[#b45279]">
          {eyebrow ?? (
            <>
              <IconoConejo className="h-4 w-4" />
              {t("common.appName")} · {t("common.tagline")}
            </>
          )}
        </p>
        <h1 className={`mb-4 font-extrabold leading-[1.06] text-tinta ${tituloClase}`}>{titulo}</h1>
        {subtitulo && <p className="max-w-[430px] text-[15px] leading-normal text-[#57516f] md:text-[17px]">{subtitulo}</p>}
        {children}
      </div>
    </section>
  );
};
