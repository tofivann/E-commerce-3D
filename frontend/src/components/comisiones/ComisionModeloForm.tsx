import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PayPalButtons } from "@paypal/react-paypal-js";
import type { JuegoComision } from "../../api/comisiones.api";
import { comisionesApi } from "../../api/comisiones.api";
import { capturarOrdenPayPal } from "../../api/paypal.api";

export const ComisionModeloForm: React.FC = () => {
  const { t } = useTranslation();
  const [juegos, setJuegos] = useState<JuegoComision[]>([]);
  const [juegoId, setJuegoId] = useState<number | null>(null);
  const [nombrePersonaje, setNombrePersonaje] = useState("");
  const [foto1, setFoto1] = useState<File | null>(null);
  const [foto2, setFoto2] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagadoPayPal, setPagadoPayPal] = useState(false);

  const formularioValido = Boolean(juegoId && foto1);

  const construirFormData = () => {
    const formData = new FormData();
    formData.append("juego", String(juegoId));
    formData.append("nombre_personaje", nombrePersonaje);
    if (foto1) formData.append("foto_referencia_1", foto1);
    if (foto2) formData.append("foto_referencia_2", foto2);
    return formData;
  };

  useEffect(() => {
    comisionesApi
      .listarJuegos()
      .then((data) => setJuegos(data.filter((j) => j.activo)))
      .catch((err) => console.error("Error al cargar juegos:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!juegoId) {
      setError(t("modeloForm.errorNoJuego"));
      return;
    }
    if (!foto1) {
      setError(t("modeloForm.errorNoFoto"));
      return;
    }

    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("juego", String(juegoId));
      formData.append("nombre_personaje", nombrePersonaje);
      formData.append("foto_referencia_1", foto1);
      if (foto2) formData.append("foto_referencia_2", foto2);

      const { checkout_url } =
        await comisionesApi.solicitarComisionModelo(formData);
      window.location.href = checkout_url;
    } catch (err) {
      console.error("Error al solicitar la comisión de modelo:", err);
      setError(t("modeloForm.errorGeneric"));
      setEnviando(false);
    }
  };

  if (pagadoPayPal) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-10">
        <span className="material-symbols-outlined text-primary text-4xl">check_circle</span>
        <p className="text-on-surface font-semibold">{t("modeloForm.paypalSuccess")}</p>
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
          {t("modeloForm.game")}
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
          {juegos.map((juego) => (
            <button
              type="button"
              key={juego.id}
              onClick={() => setJuegoId(juego.id)}
              className={`rounded-lg border p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                juegoId === juego.id
                  ? "border-primary bg-primary-container/15 "
                  : "border-outline-variant/50 hover:border-primary/50 hover:bg-surface-variant/20"
              }`}
            >
              <p className="font-semibold text-on-surface truncate">
                {juego.nombre}
              </p>
              <p className="text-primary-fixed-dim font-bold font-mono">
                ${Number(juego.precio).toFixed(2)}
              </p>
            </button>
          ))}
        </div>
        {juegos.length === 0 && (
          <p className="text-on-surface-variant text-sm mt-2">
            {t("modeloForm.noGames")}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
          {t("modeloForm.characterName")}
        </label>
        <input
          required
          className="w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner"
          placeholder={t("modeloForm.characterNamePlaceholder")}
          value={nombrePersonaje}
          onChange={(e) => setNombrePersonaje(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
            {t("modeloForm.referencePhoto1")}
          </label>
          <input
            required
            type="file"
            accept="image/*"
            onChange={(e) => setFoto1(e.target.files?.[0] || null)}
            className="w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-container file:text-on-primary-fixed file:font-semibold file:cursor-pointer cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2">
            {t("modeloForm.referencePhoto2")}{" "}
            <span className="normal-case font-normal text-outline">
              {t("motionForm.optional")}
            </span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFoto2(e.target.files?.[0] || null)}
            className="w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-container file:text-on-primary-fixed file:font-semibold file:cursor-pointer cursor-pointer"
          />
        </div>
      </div>
      <p className="text-on-surface-variant text-xs -mt-4">
        {t("modeloForm.uploadHelp")}
      </p>

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
        forceReRender={[juegoId, foto1, foto2]}
        createOrder={async () => {
          const { paypal_order_id } = await comisionesApi.solicitarComisionModeloPayPal(construirFormData());
          return paypal_order_id;
        }}
        onApprove={async (data) => {
          await capturarOrdenPayPal(data.orderID);
          setPagadoPayPal(true);
        }}
        onError={() => setError(t("common.paypalError"))}
      />
    </form>
  );
};
