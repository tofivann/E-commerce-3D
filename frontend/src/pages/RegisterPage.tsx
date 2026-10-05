import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { userApi } from "../services/userApi";
import type { DatosRegistro, MotivoCodigoInvalido, RegisterData } from "../services/userApi";
import { capturarOrdenPayPal } from "../api/paypal.api";
import { DatosRegistroForm } from "../components/registro/DatosRegistroForm";
import type { FormularioRegistro } from "../components/registro/DatosRegistroForm";
import { PagoRegistroPaso } from "../components/registro/PagoRegistroPaso";
import { VerificarCorreoPaso } from "../components/registro/VerificarCorreoPaso";
import { useCuentaAtras } from "../hooks/useCuentaAtras";
import { extraerErroresValidacion } from "../utils/erroresApi";

// El registro va en tres pasos, y la cuenta solo se crea en el último:
//   datos  → se validan y se manda un código de 6 dígitos al correo
//   codigo → el usuario lo escribe y el servidor lo comprueba
//   pago   → con el correo verificado, se crea la cuenta y se paga
type Paso = "datos" | "codigo" | "pago";

const FORMULARIO_VACIO: FormularioRegistro = {
  username: "",
  nombre: "",
  email: "",
  password: "",
  passwordConfirm: "",
  terms: false,
};

const CLAVE_ERROR_CODIGO: Record<MotivoCodigoInvalido, string> = {
  incorrecto: "register.codeErrorIncorrect",
  expirado: "register.codeErrorExpired",
  demasiados_intentos: "register.codeErrorTooManyAttempts",
};

type Aviso = { tipo: "error" | "ok"; texto: string } | null;

export const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const [paso, setPaso] = useState<Paso>("datos");
  const [formulario, setFormulario] = useState<FormularioRegistro>(FORMULARIO_VACIO);
  const [codigo, setCodigo] = useState("");
  const [vigenciaMinutos, setVigenciaMinutos] = useState(0);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [ocupado, setOcupado] = useState(false);
  const [pagadoPayPal, setPagadoPayPal] = useState(false);
  const esperaReenvio = useCuentaAtras();

  // Al ir a Stripe `ocupado` se queda en true. Si el usuario vuelve con
  // "atrás", el navegador puede restaurar la página tal cual estaba (bfcache)
  // con el botón bloqueado: "pageshow" con persisted detecta ese caso.
  useEffect(() => {
    const alMostrar = (evento: PageTransitionEvent) => {
      if (evento.persisted) setOcupado(false);
    };
    window.addEventListener("pageshow", alMostrar);
    return () => window.removeEventListener("pageshow", alMostrar);
  }, []);

  const error = (clave: string) => setAviso({ tipo: "error", texto: t(clave) });

  const datos: DatosRegistro = {
    username: formulario.username.trim(),
    nombre: formulario.nombre.trim(),
    email: formulario.email.trim().toLowerCase(),
    password: formulario.password,
  };

  const irA = (nuevo: Paso) => {
    setPaso(nuevo);
    if (nuevo !== "pago") setCodigo("");
  };

  // Un 400 al validar los datos (aquí o al crear la cuenta): se vuelve al
  // formulario con el motivo. Devuelve false si el error no era de datos.
  const mostrarErrorDeDatos = (err: unknown): boolean => {
    const errores = extraerErroresValidacion(err);
    if (!errores) return false;
    if (errores.email) error("register.errorEmailTaken");
    else if (errores.username) error("register.errorUsernameTaken");
    else error("register.errorDuplicate");
    irA("datos");
    return true;
  };

  // Pide un código (la primera vez y al reenviar). Devuelve si hay un código
  // vigente esperando en el correo.
  const pedirCodigo = async (): Promise<boolean> => {
    try {
      const enviado = await userApi.solicitarCodigoRegistro(datos);
      setVigenciaMinutos(enviado.vigencia_minutos);
      esperaReenvio.iniciar(enviado.espera_segundos);
      return true;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        // Se acaba de mandar uno a este correo: sigue sirviendo, solo hay
        // que esperar para pedir otro. Sin ese dato es el límite por IP.
        const espera = Number(err.response.data?.espera_segundos);
        if (espera > 0) {
          esperaReenvio.iniciar(espera);
          return true;
        }
        error("register.errorTooManyRequests");
      } else if (!mostrarErrorDeDatos(err)) {
        error("register.errorGeneric");
      }
      return false;
    }
  };

  const continuar = async () => {
    setAviso(null);
    if (formulario.password !== formulario.passwordConfirm) return error("register.errorPasswordMismatch");
    if (!formulario.terms) return error("register.errorTerms");

    setOcupado(true);
    if (await pedirCodigo()) irA("codigo");
    setOcupado(false);
  };

  const reenviar = async () => {
    setAviso(null);
    setOcupado(true);
    if (await pedirCodigo()) setAviso({ tipo: "ok", texto: t("register.codeResent") });
    setOcupado(false);
  };

  const verificar = async (escrito: string) => {
    setAviso(null);
    setOcupado(true);
    try {
      await userApi.verificarCodigoRegistro(datos.email, escrito);
      setCodigo(escrito);
      setPaso("pago");
    } catch (err) {
      const motivo = axios.isAxiosError(err) ? (err.response?.data?.motivo as MotivoCodigoInvalido | undefined) : undefined;
      if (axios.isAxiosError(err) && err.response?.status === 429) error("register.errorTooManyRequests");
      else error((motivo && CLAVE_ERROR_CODIGO[motivo]) ?? "register.codeErrorGeneric");
    } finally {
      setOcupado(false);
    }
  };

  // El servidor vuelve a exigir el código al crear la cuenta. Si ya no vale
  // (venció mientras elegía cómo pagar) se regresa al paso del código.
  const manejarErrorAlCrearCuenta = (err: unknown) => {
    if (extraerErroresValidacion(err)?.codigo) {
      error("register.codeNoLongerValid");
      irA("codigo");
    } else if (!mostrarErrorDeDatos(err)) {
      error("register.errorGeneric");
    }
  };

  const registro = (): RegisterData => ({ ...datos, codigo });

  const pagarConTarjeta = async () => {
    setAviso(null);
    setOcupado(true);
    try {
      const respuesta = await userApi.register(registro());
      // Se va a Stripe: `ocupado` se queda puesto hasta que la página cambie.
      window.location.href = respuesta.checkout_url;
    } catch (err) {
      manejarErrorAlCrearCuenta(err);
      setOcupado(false);
    }
  };

  const crearOrdenPayPal = async (): Promise<string> => {
    setAviso(null);
    try {
      return (await userApi.registerPayPal(registro())).paypal_order_id;
    } catch (err) {
      manejarErrorAlCrearCuenta(err);
      throw err;
    }
  };

  const payPalAprobado = async (paypalOrderId: string) => {
    await capturarOrdenPayPal(paypalOrderId);
    setPagadoPayPal(true);
  };

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex items-center justify-center p-4 md:p-8 w-full pt-20 md:pt-8">
      {/* Contenedor principal general */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Columna Izquierda: Bloque de marca alineado hacia abajo (justify-end) */}
        <div className="hidden md:flex md:col-span-5 flex-col justify-end min-h-[450px] px-4 pb-4">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-primary tracking-tight mb-3 drop-shadow-lg font-display-lg">
            {t("common.appName")}
          </h2>
          <p className="text-lg lg:text-xl font-semibold text-on-surface-variant drop-shadow-md">
            {t("register.tagline")}
          </p>
          <div className="mt-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              architecture
            </span>
            <span className="text-xs font-mono tracking-widest uppercase text-primary-fixed-dim border border-primary-fixed-dim/30 px-3 py-1 rounded-full bg-primary-fixed-dim/10">
              {t("register.badge")}
            </span>
          </div>
        </div>

        {/* Columna Derecha: Tarjeta de Contenedor exclusiva para el formulario de Registro */}
        <div className="col-span-1 md:col-span-7 glass-panel rounded-2xl p-6 md:p-8 lg:p-10 shadow-2xl border border-outline-variant/20 bg-surface-container-low/60">

          {/* Mobile Brand (Visible only on mobile) */}
          <div className="md:hidden mb-6 text-center">
            <h2 className="text-3xl font-bold text-primary tracking-tight">{t("common.appName")}</h2>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-1 tracking-tight">
              {t("register.title")}
            </h1>
            <p className="text-sm md:text-base text-on-surface-variant">
              {t("register.description")}
            </p>
          </div>

          {aviso && (
            <div
              role={aviso.tipo === "error" ? "alert" : "status"}
              className={`border p-3 rounded-md text-sm text-center mb-4 ${
                aviso.tipo === "error" ? "bg-error/20 border-error text-on-error-container" : "bg-primary/10 border-primary text-on-surface"
              }`}
            >
              {aviso.texto}
            </div>
          )}

          {pagadoPayPal ? (
            <div className="bg-primary/10 border border-primary text-on-surface p-4 rounded-md text-sm text-center mb-4">
              <p className="font-semibold mb-2">{t("register.paypalSuccess")}</p>
              <Link className="text-primary hover:underline font-bold" to="/login">
                {t("register.login")}
              </Link>
            </div>
          ) : paso === "datos" ? (
            <DatosRegistroForm
              valores={formulario}
              onCambiar={(cambios) => setFormulario((actual) => ({ ...actual, ...cambios }))}
              onContinuar={continuar}
              enviando={ocupado}
            />
          ) : paso === "codigo" ? (
            <VerificarCorreoPaso
              email={datos.email}
              vigenciaMinutos={vigenciaMinutos}
              esperaReenvio={esperaReenvio.restante}
              ocupado={ocupado}
              onVerificar={verificar}
              onReenviar={reenviar}
              onCambiarCorreo={() => {
                setAviso(null);
                irA("datos");
              }}
            />
          ) : (
            <PagoRegistroPaso
              email={datos.email}
              ocupado={ocupado}
              onPagarConTarjeta={pagarConTarjeta}
              onCrearOrdenPayPal={crearOrdenPayPal}
              onPayPalAprobado={payPalAprobado}
              onErrorPayPal={() => setAviso((actual) => actual ?? { tipo: "error", texto: t("common.paypalError") })}
            />
          )}

          <p className="mt-5 text-center text-sm text-on-surface-variant">
            {t("register.alreadyHaveAccount")} <Link className="text-primary hover:text-primary-fixed-dim hover:underline underline-offset-4 transition-colors font-bold ml-1" to="/login">{t("register.login")}</Link>
          </p>

        </div>
      </div>
    </div>
  );
};