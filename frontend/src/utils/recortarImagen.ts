// Zona de una imagen, en píxeles de la imagen original.
export interface AreaPixeles {
  x: number;
  y: number;
  width: number;
  height: number;
}

function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => resolve(imagen);
    imagen.onerror = () => reject(new Error("No se pudo leer la imagen."));
    imagen.src = url;
  });
}

// Recorta en el navegador la zona cuadrada elegida de una imagen y la
// devuelve como JPEG de `lado` px como mucho. Se usa antes de subir la foto
// de perfil: al servidor le llega ya el encuadre que eligió el usuario (allí
// se vuelve a validar y a reducir, ver users/perfil.py en el backend).
export async function recortarImagen(url: string, area: AreaPixeles, lado = 800): Promise<Blob> {
  const imagen = await cargarImagen(url);
  const destino = Math.min(lado, Math.round(area.width));
  const lienzo = document.createElement("canvas");
  lienzo.width = destino;
  lienzo.height = destino;
  const contexto = lienzo.getContext("2d");
  if (!contexto) throw new Error("El navegador no permite recortar la imagen.");
  // Fondo blanco: JPEG no tiene transparencia (un PNG transparente saldría negro).
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, destino, destino);
  contexto.drawImage(imagen, area.x, area.y, area.width, area.height, 0, 0, destino, destino);

  return new Promise((resolve, reject) => {
    lienzo.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen recortada."))),
      "image/jpeg",
      0.92
    );
  });
}
