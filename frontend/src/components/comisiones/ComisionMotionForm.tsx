import React, { useEffect, useState } from "react";
import type { TramoPersonajesMotion } from "../../api/comisiones.api";
import { comisionesApi } from "../../api/comisiones.api";

export const ComisionMotionForm: React.FC = () => {
  const [tramos, setTramos] = useState<TramoPersonajesMotion[]>([]);
  const [tramoId, setTramoId] = useState<number | null>(null);
  const [nombreJuego, setNombreJuego] = useState("");
  const [nombreCancion, setNombreCancion] = useState("");
  const [linkVideo, setLinkVideo] = useState("");
  const [informacionAdicional, setInformacionAdicional] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    comisionesApi
      .listarTramosMotion()
      .then((data) => setTramos(data.filter((t) => t.activo)))
      .catch((err) => console.error("Error al cargar tramos de precio:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tramoId) {
      setError("Selecciona la cantidad de personajes.");
      return;
    }

    setEnviando(true);
    try {
      const { checkout_url } = await comisionesApi.solicitarComisionMotion({
        tramo_personajes: tramoId,
        nombre_juego: nombreJuego,
        nombre_cancion: nombreCancion,
        link_video: linkVideo,
        informacion_adicional: informacionAdicional,
      });
      window.location.href = checkout_url;
    } catch (err) {
      console.error("Error al solicitar la comisión de motion:", err);
      setError("No se pudo procesar la solicitud. Revisa los datos e inténtalo de nuevo.");
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="bg-error/20 border border-error text-on-error-container p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
          Cantidad de personajes
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tramos.map((tramo) => (
            <button
              type="button"
              key={tramo.id}
              onClick={() => setTramoId(tramo.id)}
              className={`rounded-lg border p-4 text-left transition-all outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                tramoId === tramo.id
                  ? "border-primary bg-primary-container/15 ring-1 ring-primary"
                  : "border-outline-variant/50 hover:border-primary/50 hover:bg-surface-variant/20"
              }`}
            >
              <p className="font-semibold text-on-surface">{tramo.nombre}</p>
              <p className="text-primary-fixed-dim font-bold font-mono">${Number(tramo.precio).toFixed(2)}</p>
            </button>
          ))}
        </div>
        {tramos.length === 0 && (
          <p className="text-on-surface-variant text-sm mt-2">No hay tramos de precio disponibles por ahora.</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
          Nombre del juego
        </label>
        <input
          required
          className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner"
          placeholder="Enter the game name"
          value={nombreJuego}
          onChange={(e) => setNombreJuego(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
          Nombre de la canción
        </label>
        <input
          required
          className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner"
          placeholder="Enter the song name"
          value={nombreCancion}
          onChange={(e) => setNombreCancion(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
          Link del video de la canción
        </label>
        <input
          required
          type="url"
          className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner"
          placeholder="https://www.youtube.com/watch?v=..."
          value={linkVideo}
          onChange={(e) => setLinkVideo(e.target.value)}
        />
        <p className="text-on-surface-variant text-xs mt-1">
          Pega el link a la coreografía o video exacto que quieres que use de referencia.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
          Información adicional <span className="normal-case font-normal text-outline">(opcional)</span>
        </label>
        <textarea
          rows={3}
          className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner resize-y"
          placeholder="Agrega cualquier detalle sobre el movimiento, los personajes, la cámara o la actuación."
          value={informacionAdicional}
          onChange={(e) => setInformacionAdicional(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-3 px-8 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[18px]">payments</span>
        {enviando ? "Redirigiendo a Stripe..." : "Solicitar y Pagar"}
      </button>
    </form>
  );
};
