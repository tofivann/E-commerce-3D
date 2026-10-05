import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { monedasApi } from "../../api/monedas.api";
import type { Usuario } from "../../services/userApi";
import { extraerErroresValidacion } from "../../utils/erroresApi";
import { Monedas } from "../ui/Monedas";

interface AjustarMonedasModalProps {
  usuario: Usuario;
  onCerrar: () => void;
  // El ajuste se guardó: saldo nuevo del usuario.
  onAjustado: (saldo: number) => void;
}

const inputClass =
  "w-full bg-surface-variant border border-outline-variant rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none shadow-inner";
const labelClass = "block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-2";

// Ajuste manual de monedas (regalo o corrección) desde la tabla de usuarios
// del admin. Siempre con un motivo: queda en el historial del usuario.
// Se dibuja en <body> (portal): la tabla vive dentro de un .glass-panel,
// cuyo backdrop-filter descoloca un position: fixed.
export const AjustarMonedasModal: React.FC<AjustarMonedasModalProps> = ({ usuario, onCerrar, onAjustado }) => {
  const { t } = useTranslation();
  const [operacion, setOperacion] = useState<"sumar" | "quitar">("sumar");
  const [cantidad, setCantidad] = useState("");
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saldo = usuario.saldo_monedas ?? 0;
  const numero = /^\d+$/.test(cantidad.trim()) ? Number(cantidad.trim()) : 0;
  const quitaDeMas = operacion === "quitar" && numero > saldo;
  const valido = numero > 0 && nota.trim() !== "" && !quitaDeMas;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    setError(null);
    setGuardando(true);
    try {
      onAjustado(await monedasApi.ajustar(usuario.id, operacion === "sumar" ? numero : -numero, nota.trim()));
      onCerrar();
    } catch (err) {
      console.error("Error al ajustar las monedas:", err);
      const errores = extraerErroresValidacion(err);
      setError(errores?.cantidad ?? errores?.nota ?? errores?.[""] ?? t("monedas.ajusteError"));
      setGuardando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onCerrar} />
      <form
        onSubmit={guardar}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ajustarMonedasTitulo"
        className="relative w-full max-w-md max-h-full overflow-y-auto rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-5"
      >
        <div>
          <h2 id="ajustarMonedasTitulo" className="text-xl font-bold text-on-surface">
            {t("monedas.ajusteTitulo")}
          </h2>
          <p className="text-sm text-on-surface-variant mt-1 break-words">
            {usuario.nombre || usuario.username} · {usuario.email}
          </p>
          <p className="text-sm text-on-surface mt-2 flex items-center gap-2">
            {t("monedas.saldoActual")} <Monedas cantidad={saldo} formato="largo" className="text-primary" />
          </p>
        </div>

        {error && (
          <div role="alert" className="bg-error/20 border border-error text-on-error-container p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-surface-container-high/60 border border-outline-variant/30">
          {(["sumar", "quitar"] as const).map((opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => setOperacion(opcion)}
              aria-pressed={operacion === opcion}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                operacion === opcion ? "bg-primary-container text-on-primary-fixed" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{opcion === "sumar" ? "add" : "remove"}</span>
              {t(opcion === "sumar" ? "monedas.ajusteSumar" : "monedas.ajusteQuitar")}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="ajusteCantidad" className={labelClass}>
            {t("monedas.ajusteCantidad")}
          </label>
          <input
            id="ajusteCantidad"
            type="text"
            inputMode="numeric"
            autoFocus
            className={`${inputClass} font-mono`}
            placeholder="0"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          {quitaDeMas && <p className="text-error text-xs mt-1">{t("monedas.ajusteQuitaDeMas", { count: saldo })}</p>}
        </div>

        <div>
          <label htmlFor="ajusteNota" className={labelClass}>
            {t("monedas.ajusteMotivo")}
          </label>
          <input
            id="ajusteNota"
            maxLength={200}
            className={inputClass}
            placeholder={t("monedas.ajusteMotivoPlaceholder")}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
          <p className="text-on-surface-variant text-xs mt-1">{t("monedas.ajusteMotivoAyuda")}</p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="border border-outline-variant/60 text-on-surface-variant rounded-lg py-2.5 px-5 font-semibold hover:border-primary/50 hover:text-on-surface transition-colors disabled:opacity-50 cursor-pointer"
          >
            {t("monedas.ajusteCancelar")}
          </button>
          <button
            type="submit"
            disabled={!valido || guardando}
            className="bg-primary-container text-on-primary-fixed btn-glow-inner rounded-lg py-2.5 px-5 font-semibold hover:bg-primary-fixed-dim transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {guardando ? t("monedas.ajusteGuardando") : t("monedas.ajusteGuardar")}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
};
