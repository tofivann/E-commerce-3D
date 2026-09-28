import axios from "axios";

// Errores de validación tal como los devuelve DRF en un 400:
//   { "campo": ["mensaje", ...], "otro_campo": ["..."], "non_field_errors": ["..."] }
// o, para errores globales, { "detail": "mensaje" }.
export type ErroresPorCampo = Record<string, string>;

// Aplana la respuesta de un 400 de DRF a { campo: "primer mensaje" }. Los
// errores sin campo (`detail`, `non_field_errors`) quedan bajo la clave "".
// Para cualquier otra respuesta (red, 500, 401...) devuelve null: el que
// llama decide el mensaje genérico.
export function extraerErroresValidacion(err: unknown): ErroresPorCampo | null {
  if (!axios.isAxiosError(err) || err.response?.status !== 400) return null;
  const data: unknown = err.response.data;
  if (!data || typeof data !== "object") return null;

  const errores: ErroresPorCampo = {};
  for (const [campo, valor] of Object.entries(data as Record<string, unknown>)) {
    const mensaje = Array.isArray(valor) ? valor[0] : valor;
    if (typeof mensaje !== "string") continue;
    const clave = campo === "detail" || campo === "non_field_errors" ? "" : campo;
    errores[clave] = mensaje;
  }
  return Object.keys(errores).length > 0 ? errores : null;
}
