import stripe
from django.conf import settings
from django.db import transaction
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