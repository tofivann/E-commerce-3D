import React from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "../components/layout/AppLayout";
import { GuestLayout } from "../components/layout/GuestLayout";
import { HojaSeccion } from "../components/layout/HojaSeccion";
import { ListaPublicaciones } from "../components/novedades/ListaPublicaciones";

interface NovedadesPageProps {
  isLoggedIn: boolean;
  isStaff?: boolean;
  isSubscribed?: boolean;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLogoutClick: () => void;
}

// "Novedades": las publicaciones de la dueña. Las ve todo el mundo (también
// sin sesión, como la portada); comentar pide suscripción activa o staff.
export const NovedadesPage: React.FC<NovedadesPageProps> = ({
  isLoggedIn,
  isStaff = false,
  isSubscribed = false,
  onLoginClick,
  onRegisterClick,
  onLogoutClick,
}) => {
  const { t } = useTranslation();
  const hasAccess = isLoggedIn && (isStaff || isSubscribed);
  const hoja = <HojaSeccion titulo={t("novedades.title")} subtitulo={t("novedades.subtitle")} />;
  const lista = <ListaPublicaciones hasAccess={hasAccess} isLoggedIn={isLoggedIn} onLoginClick={onLoginClick} />;

  if (isLoggedIn) {
    return (
      <AppLayout isStaff={isStaff} hasAccess={hasAccess} onLogout={onLogoutClick} hoja={hoja}>
        {lista}
      </AppLayout>
    );
  }
  return (
    <GuestLayout onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} mainClassName="flex flex-col gap-16">
      {hoja}
      <div className="bandeja-kit">{lista}</div>
    </GuestLayout>
  );
};
