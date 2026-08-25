import stripe
from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Usuario
from .serializers import (
    CustomTokenObtainPairSerializer,
    RegistroSerializer,
    UsuarioSerializer,
)

# Inicializamos Stripe con la clave secreta
stripe.api_key = settings.STRIPE_SECRET_KEY


# ==========================================
# VISTA DE LOGIN Y GENERACIÓN DE TOKENS (JWT)
# ==========================================
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


# ==========================================
# CRUD DE USUARIOS (VIEWSET)
# ==========================================
class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

    def get_permissions(self):
        return [permissions.IsAdminUser()]


# ==========================================
# VISTAS DE REGISTRO Y PAGOS / WEBHOOKS
# ==========================================
class RegistroView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegistroSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # 1. Creamos el usuario (nace como PENDIENTE_PAGO)
        usuario = serializer.save()

        # 2. Definimos el monto y producto para la suscripción en Stripe
        line_items = [
            {
                "price_data": {
                    "currency": "usd",
                    "unit_amount": 2000,  # $20.00 USD en centavos (ajusta si es necesario)
                    "product_data": {
                        "name": "Suscripción / Registro a la Plataforma"
                    },
                },
                "quantity": 1,
            }
        ]

        try:
            # 3. Creamos la sesión de pago en Stripe vinculando el ID del usuario
            session = stripe.checkout.Session.create(
                mode="payment",
                payment_method_types=["card"],
                line_items=line_items,
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
            transaction.set_rollback(True)
            return Response(
                {
                    "detail": f"No se pudo iniciar el pago con Stripe: {e.user_message or str(e)}"
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # 4. Retornamos la URL de pago para que el frontend redirija al usuario
        return Response(
            {
                "mensaje": "¡Registro exitoso! Por favor proceda al pago para activar su cuenta.",
                "email": usuario.email,
                "estado_suscripcion": usuario.estado_suscripcion,
                "checkout_url": session.url,
            },
            status=status.HTTP_201_CREATED,
        )


class StripeWebhookRegistroView(generics.GenericAPIView):
    """Recibe los eventos de Stripe de forma segura y activa la suscripción del usuario."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except (ValueError, stripe.SignatureVerificationError) as e:
            print(f"Error de firma en Webhook: {e}")
            return HttpResponse(status=400)

        # Si el pago se completó con éxito en Stripe
        if event["type"] == "checkout.session.completed":
            try:
                session_data = event["data"]["object"]
                self._activar_suscripcion_usuario(session_data)
            except Exception as e:
                # Esto atrapará cualquier error interno y evitará que Stripe reintente infinitamente
                print(f"Error procesando activación en webhook: {e}")
                return HttpResponse(status=500)

        return HttpResponse(status=200)

    @transaction.atomic
    def _activar_suscripcion_usuario(self, session_data):
        # Soporte universal: funciona tanto si session_data es dict como si es objeto de Stripe
        if isinstance(session_data, dict):
            user_id = session_data.get("client_reference_id")
        else:
            user_id = getattr(session_data, "client_reference_id", None)

        if not user_id:
            print("Webhook recibido sin client_reference_id")
            return

        try:
            # Buscamos al usuario de forma segura con bloqueo
            usuario = Usuario.objects.select_for_update().get(pk=user_id)
        except Usuario.DoesNotExist:
            print(f"Usuario con ID {user_id} no encontrado en la base de datos.")
            return

        # Si ya está activo, no hacemos nada (Idempotencia)
        if usuario.estado_suscripcion == Usuario.EstadoSuscripcion.ACTIVO:
            return

        # Cambiamos el estado a ACTIVO para que pueda ver los productos
        usuario.estado_suscripcion = Usuario.EstadoSuscripcion.ACTIVO
        usuario.save(update_fields=["estado_suscripcion"])
        print(f"¡Suscripción activada con éxito para el usuario ID: {user_id}!")

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
                        "currency": "usd",
                        "unit_amount": 2000, # Ajusta el monto según tu modelo de negocio
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