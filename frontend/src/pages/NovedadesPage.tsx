import React from "react";
import { useTranslation } from "react-i18next";
import { Bandeja } from "../components/layout/Bandeja";
import { HojaSeccion } from "../components/layout/HojaSeccion";
import { ListaPublicaciones } from "../components/novedades/ListaPublicaciones";

// "Novedades": las publicaciones de la dueña. Solo para suscriptores activos
// o staff (la ruta lo garantiza en App.tsx y el backend lo vuelve a exigir).
// El menú y la barra los pone AppLayout; aquí solo va el contenido.
export const NovedadesPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <HojaSeccion titulo={t("novedades.title")} subtitulo={t("novedades.subtitle")} />
      <Bandeja>
        <ListaPublicaciones />
      </Bandeja>
    </>
  );
};
