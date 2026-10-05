import { axiosClient } from "../services/axiosClient";

// Descarga un archivo por un endpoint que exige sesión. Los archivos que se
// venden o se entregan NO tienen dirección pública (el backend solo los
// entrega por vistas que comprueban sesión y derecho), así que no sirve un
// <a href> normal: el navegador no mandaría el token. Se pide con axios
// (que sí lo manda), y el resultado se guarda con un enlace temporal.
//
// Único sitio donde se hace esto: lo usan la biblioteca, las comisiones del
// cliente y las descargas del panel admin.
export async function descargarConSesion(ruta: string, nombrePorDefecto: string): Promise<void> {
  const respuesta = await axiosClient.get(ruta, { responseType: "blob" });

  // El backend manda el nombre real del archivo en Content-Disposition
  // (expuesto por CORS_EXPOSE_HEADERS); si no llega, se usa el de reserva.
  const disposition = respuesta.headers["content-disposition"] as string | undefined;
  const nombre = disposition?.match(/filename="?([^"]+)"?/)?.[1] || nombrePorDefecto;

  const url = URL.createObjectURL(respuesta.data as Blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
