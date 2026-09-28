import React from "react";
import { extraerIdYoutube } from "../../utils/youtube";

interface YoutubeEmbedProps {
  url: string | null | undefined;
  // Título accesible del iframe (lo lee el lector de pantalla).
  title: string;
  className?: string;
  // Qué mostrar si el link no es un video de YouTube reconocible (o está
  // vacío). Por defecto no se renderiza nada.
  fallback?: React.ReactNode;
}

// Reproductor de YouTube embebido (16:9). Único lugar donde se arma el
// <iframe> de YouTube: lo usan la ficha de producto y el detalle de comisión
// (video de referencia y video del resultado) para que se vea igual en todos.
export const YoutubeEmbed: React.FC<YoutubeEmbedProps> = ({ url, title, className = "", fallback = null }) => {
  const videoId = extraerIdYoutube(url);
  if (!videoId) return <>{fallback}</>;

  return (
    <div className={`w-full aspect-video rounded-xl overflow-hidden bg-surface-container-lowest ${className}`}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};
