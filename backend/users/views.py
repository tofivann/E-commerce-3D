import json

import stripe
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings
from django.db import transaction
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenBlacklistView, TokenObtainPairView, TokenRefreshView
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from core.email_utils import enviar_email
from core.idiomas import EN, ES, idioma_de_peticion
from core import paypal_utils
from . import verificacion
from .models import Usuario
from .serializers import (
    CustomTokenObtainPairSerializer,
    CustomTokenRefreshSerializer,
    DatosRegistroSerializer,
    GoogleLoginSerializer,
    MiPerfilSerializer,
    RegistroSerializer,
    UsuarioSerializer,
    VerificarCodigoSerializer,
)
from .suscripcion import MONEDA_SUSCRIPCION, PRECIO_SUSCRIPCION, precio_suscripcion_en_centavos
from .throttles import ComprobacionCodigoThrottle, EnvioCodigoThrottle
from .tokens import respuesta_login

# Inicializamos Stripe con la clave secreta
stripe.api_key = settings.STRIPE_SECRET_KEY


# ==========================================
# VISTA DE LOGIN Y GENERACIÓN DE TOKENS (JWT)
# ==========================================
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer


class LogoutView(TokenBlacklistView):
    """POST {"refresh": ...}: manda el refresh token a la lista negra. Sin
    esto, cerrar sesión solo borraba el token del navegador y seguía siendo
    válido en el servidor hasta 7 días (cualquiera que lo hubiera copiado
    podía seguir renovando la sesión). El access token vigente no se puede
    revocar (es stateless), pero como mucho vive 60 minutos."""


# ==========================================
# CRUD DE USUARIOS (VIEWSET)
# ==========================================
class UsuarioViewSet(viewsets.ModelViewSet):
    # select_related: el serializer muestra el saldo de monedas de cada
    # usuario; sin esto sería una consulta por fila de la tabla.
    queryset = Usuario.objects.select_related('monedero')
    serializer_class = UsuarioSerializer

    def get_permissions(self):
        return [permissions.IsAdminUser()]


# ==========================================
# VISTAS DE REGISTRO Y PAGOS / WEBHOOKS
# ==========================================
class PrecioSuscripcionView(APIView):
    """`users/suscripcion/precio/` (GET, público): lo que cuesta activar una
    cuenta. Lo muestran el formulario de registro y el aviso de cuenta
    pendiente; sale de la misma constante que usan los cobros."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"precio": f"{PRECIO_SUSCRIPCION:.2f}", "moneda": MONEDA_SUSCRIPCION})


class SolicitarCodigoRegistroView(generics.GenericAPIView):
    """Paso 1 del registro (`auth/register/codigo/`): valida los datos del
    formulario y manda un código de 6 dígitos al correo. No crea la cuenta.
    El mismo endpoint sirve para "reenviar código"."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [EnvioCodigoThrottle]
    serializer_class = DatosRegistroSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            verificacion.enviar_codigo(email, idioma_de_peticion(request))
        except verificacion.EsperaReenvio as e:
            return Response(
                {"detail": "Acabamos de enviarte un código. Espera un momento para pedir otro.", "espera_segundos": e.segundos},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        return Response({
            "email": email,
            "vigencia_minutos": int(verificacion.VIGENCIA_CODIGO.total_seconds() // 60),
            "espera_segundos": int(verificacion.ESPERA_REENVIO.total_seconds()),
        })


class VerificarCodigoRegistroView(generics.GenericAPIView):
    """Paso 2 del registro (`auth/register/verificar-codigo/`): comprueba el
    código que el usuario escribió, para que la pantalla pueda pasar al pago.
    No crea nada ni gasta el código: el registro lo vuelve a exigir."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ComprobacionCodigoThrottle]
    serializer_class = VerificarCodigoSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            verificacion.comprobar_codigo(serializer.validated_data['email'], serializer.validated_data['codigo'])
        except verificacion.CodigoInvalido as e:
            # `motivo` es estable (el mensaje no): con él traduce el frontend.
            return Response({"codigo": [e.mensaje], "motivo": e.motivo}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"verificado": True})


class PagoNoIniciado(Exception):
    """La pasarela no pudo abrir el cobro; el mensaje va al usuario."""


class RegistroBaseView(generics.GenericAPIView):
    """Paso 3 del registro: crea la cuenta (nace PENDIENTE_PAGO) y abre el
    cobro de la suscripción. Cada pasarela es una subclase que solo define
    `iniciar_pago`.

    Exige el código de verificación del correo (RegistroSerializer). Esa
    validación va FUERA de la transacción a propósito: un código equivocado
    cuenta un intento, y dentro del `atomic` el error lo revertiría.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = RegistroSerializer

    def iniciar_pago(self, usuario):
        """Abre el cobro para `usuario` y devuelve los datos que el frontend
        necesita para continuarlo. Lanza `PagoNoIniciado` si falla."""
        raise NotImplementedError

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            # Cuenta y cobro, o ninguno de los dos: si la pasarela falla no
            # queda una cuenta huérfana (ni se gasta el código).
            with transaction.atomic():
                # Se recuerda el idioma en que se registró: el correo de
                # "cuenta activada" sale después, desde el webhook, sin él presente.
                usuario = serializer.save(idioma=idioma_de_peticion(request))
                datos_pago = self.iniciar_pago(usuario)
        except PagoNoIniciado as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response(
            {
                "mensaje": "¡Registro exitoso! Por favor proceda al pago para activar su cuenta.",
                "email": usuario.email,
                "estado_suscripcion": usuario.estado_suscripcion,
                **datos_pago,
            },
            status=status.HTTP_201_CREATED,
        )


class RegistroView(RegistroBaseView):
    """Registro pagando con tarjeta: devuelve la `checkout_url` de Stripe."""

    def iniciar_pago(self, usuario):
        try:
            session = stripe.checkout.Session.create(
                mode="payment",
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": MONEDA_SUSCRIPCION.lower(),
                        "unit_amount": precio_suscripcion_en_centavos(),
                        "product_data": {"name": "Suscripción / Registro a la Plataforma"},
                    },
                    "quantity": 1,
                }],
                success_url=(
                    f"{settings.FRONTEND_URL}/registro-exitoso"
                    "?session_id={CHECKOUT_SESSION_ID}"
                ),
                cancel_url=f"{settings.FRONTEND_URL}/register",
                client_reference_id=str(usuario.id),
                metadata={
                    "user_id": str(usuario.id),
                    "tipo": "suscripcion_usuario",
                },
            )
        except stripe.StripeError as e:
            raise PagoNoIniciado(f"No se pudo iniciar el pago con Stripe: {e.user_message or str(e)}")
        return {"checkout_url": session.url}


class RegistroPayPalView(RegistroBaseView):
    """Registro pagando con PayPal: devuelve el `paypal_order_id`, que el
    frontend captura con core.views.PayPalCapturarOrdenView cuando el usuario
    aprueba el pago."""

    def iniciar_pago(self, usuario):
        try:
            orden_paypal = paypal_utils.crear_orden(
                total=PRECIO_SUSCRIPCION,
                descripcion="Suscripción / Registro a la Plataforma",
                custom_id=json.dumps({"tipo": "suscripcion_usuario", "user_id": str(usuario.id)}),
            )
        except paypal_utils.PayPalError as e:
            raise PagoNoIniciado(f"No se pudo iniciar el pago con PayPal: {e}")
        return {"paypal_order_id": orden_paypal["id"]}


class VerificarPagoUsuarioView(generics.GenericAPIView):
    """
    Endpoint público usado por las páginas de éxito post-Stripe (registro y
    activación de cuenta) para confirmar el estado REAL de la suscripción,
    en vez de asumir éxito solo porque el navegador volvió del checkout.
    No requiere sesión iniciada porque tras un registro nuevo el usuario
    todavía no tiene tokens JWT.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        session_id = request.query_params.get("session_id")
        if not session_id:
            return Response({"detail": "Falta session_id."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except stripe.StripeError as e:
            return Response(
                {"detail": f"No se pudo consultar la sesión de pago: {e.user_message or str(e)}"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Nota SDK v15.5.1: StripeObject bloquea .get() a propósito (no es un
        # dict real), pero sí soporta 'in' y [] como acceso tipo diccionario.
        metadata = session.metadata or {}
        user_id = metadata["user_id"] if "user_id" in metadata else None
        user_id = user_id or session.client_reference_id
        if not user_id:
            return Response({"detail": "La sesión no está asociada a un usuario."}, status=status.HTTP_404_NOT_FOUND)

        try:
            usuario = Usuario.objects.get(pk=user_id)
        except Usuario.DoesNotExist:
            return Response({"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "payment_status": session.payment_status,
                "estado_suscripcion": usuario.estado_suscripcion,
            },
            status=status.HTTP_200_OK,
        )


class ActivarCuentaPagoView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        usuario = request.user

        # SEGURIDAD: Solo permitimos generar pago si el usuario está realmente pendiente
        if usuario.estado_suscripcion != Usuario.EstadoSuscripcion.PENDIENTE_PAGO:
            return Response(
                {"detail": "Esta cuenta ya se encuentra activa o no requiere pago."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            session = stripe.checkout.Session.create(
                mode="payment",
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": MONEDA_SUSCRIPCION.lower(),
                        "unit_amount": precio_suscripcion_en_centavos(),
                        "product_data": {"name": "Activación de Cuenta / Suscripción"},
                    },
                    "quantity": 1,
                }],
                success_url=f"{settings.FRONTEND_URL}/activacion-exitosa?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.FRONTEND_URL}/perfil",
                client_reference_id=str(usuario.id),
                metadata={
                    "user_id": str(usuario.id),
                    "tipo": "activacion_cuenta",
                },
            )
        except stripe.StripeError as e:
            return Response(
                {"detail": f"Error al conectar con la pasarela de pagos: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        return Response({"checkout_url": session.url}, status=status.HTTP_200_OK)


class ActivarCuentaPagoPayPalView(generics.GenericAPIView):
    """Igual que ActivarCuentaPagoView, pero crea una orden de PayPal."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        usuario = request.user

        if usuario.estado_suscripcion != Usuario.EstadoSuscripcion.PENDIENTE_PAGO:
            return Response(
                {"detail": "Esta cuenta ya se encuentra activa o no requiere pago."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            orden_paypal = paypal_utils.crear_orden(
                total=PRECIO_SUSCRIPCION,
                descripcion="Activación de Cuenta / Suscripción",
                custom_id=json.dumps({"tipo": "activacion_cuenta", "user_id": str(usuario.id)}),
            )
        except paypal_utils.PayPalError as e:
            return Response(
                {"detail": f"Error al conectar con la pasarela de pagos: {e}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        return Response({"paypal_order_id": orden_paypal["id"]}, status=status.HTTP_200_OK)


class GoogleLoginView(generics.GenericAPIView):
    """
    Permite el inicio de sesión exclusivo con Google para usuarios ya registrados,
    empaquetando la misma estructura de usuario que el login tradicional por JWT.
    """
    permission_classes = [permissions.AllowAny]

    serializer_class = GoogleLoginSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['token']
        remember_me = serializer.validated_data['remember_me']

        try:
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
            email = idinfo.get("email")

            if not email:
                return Response({"detail": "El token de Google no contiene un correo válido."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                usuario = Usuario.objects.get(email=email)
            except Usuario.DoesNotExist:
                return Response(
                    {"detail": "No existe una cuenta registrada con este correo. Por favor, regístrate primero."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # No se bloquea por estado de suscripción: mismo comportamiento que el
            # login tradicional por contraseña, que tampoco lo exige. El resto de
            # la app (banner de pago pendiente, hasAccess, etc.) ya maneja la
            # cuenta pendiente/inactiva una vez adentro.
            # Misma estructura y mismas reglas de duración ("Mantener sesión
            # abierta") que el login por contraseña, vía el helper compartido.
            return Response({
                **respuesta_login(usuario, remember_me),
                "mensaje": "Inicio de sesión exitoso con Google.",
            }, status=status.HTTP_200_OK)

        except ValueError:
            return Response({"detail": "Token de Google inválido o expirado."}, status=status.HTTP_400_BAD_REQUEST)

class SolicitarResetPasswordView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"detail": "El correo es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            usuario = Usuario.objects.get(email=email)
        except Usuario.DoesNotExist:
            return Response({"mensaje": "Si el correo existe, se ha enviado un enlace de recuperación."}, status=status.HTTP_200_OK)

        token_generator = PasswordResetTokenGenerator()
        token = token_generator.make_token(usuario)
        uid = urlsafe_base64_encode(force_bytes(usuario.pk))

        enlace = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"

        enviar_email(
            to=usuario.email,
            asuntos={ES: "Restablece tu contraseña", EN: "Reset your password"},
            template_name='users/email_reset_password.html',
            context={'nombre': usuario.nombre, 'enlace': enlace},
            # Quien lo pide está presente y acaba de leer el formulario en un
            # idioma: se le responde en ese. Si la petición no lo dice, en el
            # que tenga guardado su cuenta.
            idioma=idioma_de_peticion(request) or usuario.idioma,
        )

        return Response({"mensaje": "Si el correo existe, se ha enviado un enlace de recuperación."}, status=status.HTTP_200_OK)


class ConfirmarResetPasswordView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        nueva_password = request.data.get("nueva_password")

        if not all([uid, token, nueva_password]):
            return Response({"detail": "Faltan datos obligatorios."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            usuario = Usuario.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            return Response({"detail": "Enlace inválido o corrupto."}, status=status.HTTP_400_BAD_REQUEST)

        token_generator = PasswordResetTokenGenerator()
        if not token_generator.check_token(usuario, token):
            return Response({"detail": "El enlace ha expirado o ya fue utilizado."}, status=status.HTTP_400_BAD_REQUEST)

        usuario.set_password(nueva_password)
        usuario.save()

        return Response({"mensaje": "Contraseña actualizada exitosamente."}, status=status.HTTP_200_OK)


# ==========================================
# PERFIL DEL PROPIO USUARIO
# ==========================================
class MiPerfilView(generics.RetrieveUpdateAPIView):
    """`users/me/`: el usuario con sesión consulta su perfil y cambia su
    nombre o su foto (PATCH; multipart cuando viaja la foto). Cualquier cuenta
    con sesión, tenga o no suscripción: el perfil es de la cuenta. Nunca hay
    un id en la dirección: siempre es `request.user`, así nadie puede leer
    ni tocar el perfil de otro."""
    serializer_class = MiPerfilSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_object(self):
        return self.request.user


class MiFotoPerfilView(APIView):
    """`users/me/foto/` (DELETE): quita la foto de perfil. Va aparte del
    PATCH porque un formulario multipart no puede mandar "sin archivo"."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        usuario = request.user
        foto = usuario.foto_perfil
        if foto:
            anterior = foto.name
            usuario.foto_perfil = None
            usuario.save(update_fields=['foto_perfil'])
            usuario.foto_perfil.storage.delete(anterior)
        return Response(MiPerfilSerializer(usuario, context={'request': request}).data)

