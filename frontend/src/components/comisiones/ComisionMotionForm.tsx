import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PayPalButtons } from "@paypal/react-paypal-js";
import type { TramoPersonajesMotion } from "../../api/comisiones.api";
import { comisionesApi } from "../../api/comisiones.api";
import { capturarOrdenPayPal } from "../../api/paypal.api";
import { nombreTramoMotion } from "../../utils/tramoMotion";
import { extraerErroresValidacion } from "../../utils/erroresApi";
import { useMontoComision } from "../../hooks/useMontoComision";
import { perfilStore } from "../../stores/perfilStore";
import { Monedas } from "../ui/Monedas";
import { PagarConMonedas } from "../ui/PagarConMonedas";
import { MontoComisionInput } from "./MontoComisionInput";

export const ComisionMotionForm: React.FC = () => {
  const { t } = useTranslation();
  const [tramos, setTramos] = useState<TramoPersonajesMotion[]>([]);
  const [tramoId, setTramoId] = useState<number | null>(null);
  const [nombreJuego, setNombreJuego] = useState("");
  const [nombreCancion, setNombreCancion] = useState("");
  const [linkVideo, setLinkVideo] = useState("");
  const [informacionAdicional, setInformacionAdicional] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Con qué se pagó, una vez pagado sin salir de la página (Stripe redirige).
  const [pagadoCon, setPagadoCon] = useState<"paypal" | "monedas" | null>(null);

  // El precio del tramo elegido es el mínimo; el cliente puede pagar más.
  const tramoElegido = tramos.find((tramo) => tramo.id === tramoId) ?? null;
  const pago = useMontoComision(tramoElegido ? Number(tramoElegido.precio) : null);

  const datosCompletos = Boolean(tramoId && nombreJuego && nombreCancion && linkVideo);
  const formularioValido = datosCompletos && pago.valido;

  const datosSolicitud = () => ({
    tramo_personajes: tramoId as number,
    nombre_juego: nombreJuego,
    nombre_cancion: nombreCancion,
    link_video: linkVideo,
    informacion_adicional: informacionAdicional,
  });
  // Con dinero se manda además el monto (el precio del tramo o más).
  const construirSolicitud = () => ({ ...datosSolicitud(), monto: pago.monto });

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
      setError(t("motionForm.errorNoTramo"));
      return;
    }
    if (!pago.valido) {
      setError(pago.error);
      return;
    }
    if (!pago.confirmar()) return;

    setEnviando(true);
    try {
      const { checkout_url } = await comisionesApi.solicitarComisionMotion(construirSolicitud());
      window.location.href = checkout_url;
    } catch (err) {
      console.error("Error al solicitar la comisión de motion:", err);
      setError(extraerErroresValidacion(err)?.monto ?? t("motionForm.errorGeneric"));
      setEnviando(false);
    }
  };

  if (pagadoCon) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-10">
        <span className="material-symbols-outlined text-primary text-4xl">check_circle</span>
        <p className="text-on-surface font-semibold">
          {pagadoCon === "monedas" ? t("monedas.comisionPagada") : t("motionForm.paypalSuccess")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="bg-error/20 border border-error text-on-error-container p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
          {t("motionForm.characterCount")}
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tramos.map((tramo) => (
            <button
              type="button"
              key={tramo.id}
              onClick={() => {
                setTramoId(tramo.id);
                pago.fijarAlMinimo(tramo.precio);
              }}
              className={`rounded-lg border p-4 text-left transition-all outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                tramoId === tramo.id
                  ? "border-primary bg-primary-container/15 ring-1 ring-primary"
                  : "border-outline-variant/50 hover:border-primary/50 hover:bg-surface-variant/20"
              }`}
            >
              <p className="font-semibold text-on-surface">{nombreTramoMotion(tramo)}</p>
              <p className="text-primary-fixed-dim font-bold font-mono">${Number(tramo.precio).toFixed(2)}</p>
              {tramo.precio_monedas != null && (
                <Monedas cantidad={tramo.precio_monedas} className="text-xs text-on-surface-variant mt-1" />
              )}
            </button>
          ))}
        </div>
        {tramos.length === 0 && (
          <p className="text-on-surface-variant text-sm mt-2">{t("motionForm.noTramos")}</p>
        )}
      </div>

      <MontoComisionInput
        monto={pago.monto}
        minimo={tramoElegido ? Number(tramoElegido.precio) : null}
        error={pago.error}
        onChange={pago.setMonto}
      />

      <div>
        <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
          {t("motionForm.gameName")}
        </label>
        <input
          required
          className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner"
          placeholder={t("motionForm.gameNamePlaceholder")}
          value={nombreJuego}
          onChange={(e) => setNombreJuego(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
          {t("motionForm.songName")}
        </label>
        <input
          required
          className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner"
          placeholder={t("motionForm.songNamePlaceholder")}
          value={nombreCancion}
          onChange={(e) => setNombreCancion(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
          {t("motionForm.videoLink")}
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
          {t("motionForm.videoLinkHelp")}
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
          {t("motionForm.additionalInfo")} <span className="normal-case font-normal text-outline">{t("motionForm.optional")}</span>
        </label>
        <textarea
          rows={3}
          className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner resize-y"
          placeholder={t("motionForm.additionalInfoPlaceholder")}
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
        {enviando ? t("motionForm.redirecting") : t("motionForm.submit")}
      </button>

      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-outline-variant/50"></div>
        <span className="flex-shrink-0 mx-4 text-on-surface-variant font-mono text-xs">
          {t("common.orPayWith")}
        </span>
        <div className="flex-grow border-t border-outline-variant/50"></div>
      </div>

      <PayPalButtons
        style={{ layout: "horizontal", height: 45 }}
        disabled={!formularioValido || enviando}
        forceReRender={[tramoId, nombreJuego, nombreCancion, linkVideo, informacionAdicional, pago.monto]}
        onClick={(_data, actions) => (pago.confirmar() ? actions.resolve() : actions.reject())}
        createOrder={async () => {
          const { paypal_order_id } = await comisionesApi.solicitarComisionMotionPayPal(construirSolicitud());
          return paypal_order_id;
        }}
        onApprove={async (data) => {
          await capturarOrdenPayPal(data.orderID);
          // La comisión pagada con dinero acaba de dar una moneda: saldo al día.
          perfilStore.recargar();
          setPagadoCon("paypal");
        }}
        onError={() => setError(t("common.paypalError"))}
      />

      {/* Tercera forma de pago: el precio en monedas del tramo elegido. */}
      {tramoElegido && (
        <div className="pt-4 border-t border-outline-variant/30">
          <PagarConMonedas
            precio={tramoElegido.precio_monedas}
            deshabilitado={!datosCompletos || enviando}
            onPagar={async () => (await comisionesApi.solicitarComisionMotionMonedas(datosSolicitud())).saldo_monedas}
            onPagado={() => setPagadoCon("monedas")}
          />
        </div>
      )}
    </form>
  );
};
