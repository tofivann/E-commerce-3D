import React from "react";
import { useTranslation } from "react-i18next";

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage?.startsWith("en") ? "en" : "es";

  const setLang = (lng: "es" | "en") => {
    i18n.changeLanguage(lng);
  };

  return (
    <div
      role="group"
      aria-label="Idioma / Language"
      className="flex items-center bg-surface-variant rounded-full p-0.5 text-xs font-semibold shrink-0"
    >
      <button
        type="button"
        onClick={() => setLang("es")}
        aria-pressed={current === "es"}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          current === "es"
            ? "bg-primary-container text-on-primary-fixed"
            : "text-on-surface-variant hover:text-on-surface"
        }`}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={current === "en"}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          current === "en"
            ? "bg-primary-container text-on-primary-fixed"
            : "text-on-surface-variant hover:text-on-surface"
        }`}
      >
        EN
      </button>
    </div>
  );
};
