import { axiosClient } from "../services/axiosClient";

// Lo que responden las vistas .../descargar/ del backend (core/descargas.py).
interface EnlaceDescarga {
  url: string;
  nombre: string;
  caduca_en: number;
}

// Descarga un archivo que se vende o se entrega. Esos archivos NO tienen
// dirección pública (el backend solo los entrega comprobando sesión y
// derecho), así que un <a href> normal no sirve: el navegador no mandaría el
// token. Va en dos pasos:
//
// 1. Se pide con axios (que sí manda el token) un enlace firmado, atado al
//    usuario y al archivo, válido una hora.
// 2. Se le da ese enlace al navegador, que lo baja como cualquier descarga:
//    aparece en su barra desde el primer byte, con progreso, y se puede
//    reanudar. Antes se bajaba entero en memoria (blob) sin que el navegador
//    supiera nada; con 100 MB y conexiones lejanas se cortaba a la mitad y
//    el único aviso era "No se pudo descargar el archivo".
//
// El servidor responde con Content-Disposition: attachment, así que la
// pestaña no cambia de página. (El atributo `download` de <a> no serviría:
// los navegadores lo ignoran para otro origen, y la API es otro origen.)
//
// Único sitio donde se hace esto: lo usan la biblioteca, las comisiones del
// cliente y las descargas del panel admin.
export async function descargarConSesion(ruta: string): Promise<void> {
  const { data } = await axiosClient.get<EnlaceDescarga>(ruta);
  window.location.assign(data.url);
}
