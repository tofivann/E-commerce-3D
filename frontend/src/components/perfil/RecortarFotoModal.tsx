import React, { useState } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useTranslation } from "react-i18next";
import { recortarImagen } from "../../utils/recortarImagen";

interface RecortarFotoModalProps {
  // Dirección local (URL.createObjectURL) de la foto que eligió el usuario.
  imagenUrl: string;
  onCancelar: () => void;
  // Recibe la foto ya recortada al encuadre elegido.
  onConfirmar: (recorte: Blob) => void;
}

const ZOOM_MINIMO = 1;
const ZOOM_MAXIMO = 4;

// Ventana para encuadrar la foto de perfil antes de subirla: el usuario la
// arrastra y la acerca dentro de un círculo, que es como se verá. El arrastre
// y el zoom (ratón, rueda, dedo, pellizco) los resuelve react-easy-crop; el
// recorte en sí se hace en el navegador (utils/recortarImagen.ts).
export const RecortarFotoModal: React.FC<RecortarFotoModalProps> = ({ imagenUrl, onCancelar, onConfirmar }) => {
  const { t } = useTranslation();
  const [posicion, setPosicion] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(ZOOM_MINIMO);
  const [area, setArea] = useState<Area | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(false);

  const confirmar = async () => {
    if (!area) return;
    setProcesando(true);
    setError(false);
    try {
      onConfirmar(await recortarImagen(imagenUrl, area));
    } catch (err) {
      console.error("Error al recortar la foto:", err);
      setError(true);
      setProcesando(false);
    }
  };

  // Portal a <body>: quien abre esta ventana vive dentro de una tarjeta con
  // backdrop-filter (.glass-panel), y un ancestro así se vuelve el marco de
  // referencia de `position: fixed` — la ventana se centraría en la tarjeta
  // en vez de en la pantalla (en móvil quedaba cortada por abajo).
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t("perfil.cropTitle")}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={procesando ? undefined : onCancelar} />
      <div className="glass-panel relative w-full max-w-md max-h-full overflow-y-auto rounded-2xl p-6 flex flex-col gap-5 bg-surface-container-lowest/95">
        <div>
          <h2 className="text-xl font-bold text-on-surface">{t("perfil.cropTitle")}</h2>
          <p className="text-on-surface-variant text-sm mt-1">{t("perfil.cropHelp")}</p>
        </div>

        {/* El Cropper se posiciona en absoluto: necesita un contenedor relativo con alto. */}
        <div className="relative w-full h-72 shrink-0 rounded-xl overflow-hidden bg-surface-container-highest">
          <Cropper
            image={imagenUrl}
            crop={posicion}
            zoom={zoom}
            minZoom={ZOOM_MINIMO}
            maxZoom={ZOOM_MAXIMO}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setPosicion}
            onZoomChange={setZoom}
            onCropComplete={(_porcentajes, pixeles) => setArea(pixeles)}
          />
        </div>

        <label className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">zoom_out</span>
          <input
            id="zoomFotoPerfil"
            type="range"
            min={ZOOM_MINIMO}
            max={ZOOM_MAXIMO}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label={t("perfil.cropZoom")}
            className="flex-1 accent-primary cursor-pointer"
          />
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">zoom_in</span>
        </label>

        {error && <p className="text-error text-xs">{t("perfil.cropError")}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="border border-outline-variant/60 text-on-surface-variant rounded-lg py-2 px-4 font-semibold hover:text-on-surface transition-colors disabled:opacity-50 cursor-pointer"
          >
            {t("perfil.cropCancel")}
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={!area || procesando}
            className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-2 px-5 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {procesando ? t("perfil.saving") : t("perfil.cropConfirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
