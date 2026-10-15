import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HojaSeccion } from "../layout/HojaSeccion";

interface HeroAtelierProps {
  isLoggedIn: boolean;
  // Admin o suscriptor activo: puede ir a pedir una comisión (misma regla que
  // el enlace del menú).
  hasAccess: boolean;
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

// Id del catálogo en la portada, para que "Explorar modelos" baje hasta él.
export const ID_CATALOGO = "catalogo";

const botonBase =
  "inline-flex items-center justify-center gap-2 rounded-[9px] border px-[18px] py-[13px] text-[13px] font-semibold no-underline transition-all hover:-translate-y-px active:translate-y-px active:shadow-none";
const botonPrimario = `${botonBase} bg-vino text-[#fff7ed] border-[#833953] shadow-[inset_0_1px_#ffffff35,0_3px_0_#70354a25] hover:bg-vino-oscuro`;
const botonSecundario = `${botonBase} bg-papel-suave text-tinta border-linea-papel hover:bg-[#ebcdb9]`;

// Hero de la portada: la HojaSeccion del kit con el título grande, los
// botones y los 3 puntos fuertes. Mimi está detrás, a la derecha, en la
// escena misma; por eso aquí no hay foto.
export const HeroAtelier: React.FC<HeroAtelierProps> = ({ isLoggedIn, hasAccess, onLoginClick, onRegisterClick }) => {
  const { t } = useTranslation();

  const irAlCatalogo = () => document.getElementById(ID_CATALOGO)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <HojaSeccion
      tamano="hero"
      titulo={
        <>
          {t("home.heroTitleLine1")} <span className="text-vino">{t("home.heroTitleConnector")} {t("home.heroTitleBrand")}</span>
        </>
      }
      subtitulo={t("home.heroSubtitle")}
    >
      <>
        <div className="my-6 flex flex-wrap gap-2.5">
          {isLoggedIn ? (
            <>
              <button type="button" onClick={irAlCatalogo} className={botonPrimario}>
                <span className="material-symbols-outlined text-[18px]">view_in_ar</span>
                {t("home.heroExplore")}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              {hasAccess && (
                <Link to="/comisiones" className={botonSecundario}>
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  {t("home.heroCommission")}
                </Link>
              )}
            </>
          ) : (
            <>
              <button type="button" onClick={onRegisterClick} className={botonPrimario}>
                {t("home.heroCta")}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              <button type="button" onClick={onLoginClick} className={botonSecundario}>
                {t("home.login")}
              </button>
            </>
          )}
        </div>

        <ul className="grid grid-cols-3 gap-2 border-t border-[#d9b4ad] pt-5">
          <li className="flex flex-col items-center gap-2.5 text-center text-[11px] font-semibold leading-snug text-tinta">
            <span className="flex h-[37px] w-[37px] items-center justify-center rounded-full border border-[#bd768e] text-vino">
              <span className="material-symbols-outlined text-[20px]">view_in_ar</span>
            </span>
            {t("home.heroFeature1")}
          </li>
          <li className="flex flex-col items-center gap-2.5 text-center text-[11px] font-semibold leading-snug text-tinta">
            <span className="flex h-[37px] w-[37px] items-center justify-center rounded-full border border-[#819cab] text-[#426f86]">
              <span className="material-symbols-outlined text-[20px]">directions_run</span>
            </span>
            {t("home.heroFeature2")}
          </li>
          <li className="flex flex-col items-center gap-2.5 text-center text-[11px] font-semibold leading-snug text-tinta">
            <span className="flex h-[37px] w-[37px] items-center justify-center rounded-full border border-[#b398b8] text-[#906b9e]">
              <span className="material-symbols-outlined text-[20px]">mood</span>
            </span>
            {t("home.heroFeature3")}
          </li>
        </ul>
      </>
    </HojaSeccion>
  );
};
