// Carga, una sola vez y en orden, los scripts del kit de la escena. Viven en
// public/mimi/ (no en src/assets) porque no son módulos y piden sus imágenes
// por nombre fijo: Vite no puede renombrarlas con hash.
const RUTA_KIT = "/mimi/";

// Base desde la que los scripts del kit resuelven cada imagen.
export const RUTA_ASSETS_KIT = RUTA_KIT;

// El orden importa: cada script usa las clases que dejó el anterior en window.
const SCRIPTS = ["mimi-scene.js", "mimi-pose-data.js", "mimi-mesh.js", "mimi-character.js", "mimi-seat.js"];

let carga: Promise<void> | null = null;

const cargarScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.append(script);
  });

export const cargarKit = (): Promise<void> => {
  if (!carga) {
    carga = SCRIPTS.reduce(
      (anterior, nombre) => anterior.then(() => cargarScript(`${RUTA_KIT}js/${nombre}`)),
      Promise.resolve(),
    ).catch((error) => {
      // Si falló (sin red, archivo que falta), el próximo intento vuelve a probar.
      carga = null;
      throw error;
    });
  }
  return carga;
};
