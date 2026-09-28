// Extrae el ID de video de los formatos comunes de link de YouTube
// (watch?v=, youtu.be/, embed/, shorts/), para poder embeberlo con
// <YoutubeEmbed>. Devuelve null si el link no es de YouTube o no trae un ID
// reconocible — el que lo usa decide qué mostrar en ese caso (un link, nada).
export function extraerIdYoutube(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}
