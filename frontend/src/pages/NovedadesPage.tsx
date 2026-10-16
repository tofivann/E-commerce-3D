import React from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "../components/layout/AppLayout";
import { HojaSeccion } from "../components/layout/HojaSeccion";
import { ListaPublicaciones } from "../components/novedades/ListaPublicaciones";

interface NovedadesPageProps {
  isStaff?: boolean;
  onLogoutClick: () => void;
}

// "Novedades": las publicaciones de la dueña. Solo para suscriptores activos
// o staff (la ruta lo garantiza en App.tsx y el backend lo vuelve a exigir).
export const NovedadesPage: React.FC<NovedadesPageProps> = ({ isStaff = false, onLogoutClick }) => {
  const { t } = useTranslation();
  return (
    <AppLayout
      isStaff={isStaff}
      hasAccess
      onLogout={onLogoutClick}
      hoja={<HojaSeccion titulo={t("novedades.title")} subtitulo={t("novedades.subtitle")} />}
    >
      <ListaPublicaciones />
    </AppLayout>
  );
};
