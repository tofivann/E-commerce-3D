import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Pie de página del sitio: marca, enlaces legales y derechos. Único sitio
// donde se define; lo usan AppLayout (páginas con sesión) y la portada de
// visitante de HomePage.
export const PieDePagina: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-background w-full py-16 border-t border-outline-variant/20 mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-center px-gutter max-w-container-max mx-auto gap-4">
        <div className="text-[24px] font-bold text-primary opacity-50">{t("common.appName")}</div>
        <div className="flex items-center gap-4">
          <Link to="/privacidad" className="text-on-surface-variant text-sm hover:text-primary no-underline">
            {t("home.footerPrivacy")}
          </Link>
          <Link to="/terminos" className="text-on-surface-variant text-sm hover:text-primary no-underline">
            {t("home.footerTerms")}
          </Link>
        </div>
        <div className="text-on-surface-variant text-sm">{t("home.footerRights")}</div>
      </div>
    </footer>
  );
};
