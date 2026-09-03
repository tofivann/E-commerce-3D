import stripe
from django.conf import settings
from django.http import HttpResponse
from rest_framework import permissions
from rest_framework.views import APIView

from shopping_cart.services import marcar_orden_pagada
from users.services import activar_suscripcion_usuario
from custom_orders.services import marcar_comision_pagada
from .stripe_utils import stripe_dict_get

stripe.api_key = settings.STRIPE_SECRET_KEY

# Tipos de sesión de checkout que representan una activación de cuenta
# (registro nuevo o pago de una cuenta que había quedado PENDIENTE_PAGO).
TIPOS_ACTIVACION_USUARIO = {'suscripcion_usuario', 'activacion_cuenta'}

# Tipos de sesión de checkout que representan el pago de una comisión
# (Motion o Modelo Nuevo) — ver custom_orders.
TIPOS_COMISION = {'comision_motion', 'comision_modelo'}


class StripeWebhookView(APIView):
    """
    Único punto de entrada para los eventos de Stripe de toda la plataforma
    (compras del carrito, registro nuevo, activación de cuenta pendiente).
    Verifica la firma una sola vez con STRIPE_WEBHOOK_SECRET (nunca se
    procesa un payload sin verificar) y enruta checkout.session.completed
    al manejador correspondiente según metadata['tipo'], que cada vista que
    crea una sesión de Stripe (CheckoutView, RegistroView,
    ActivarCuentaPagoView) debe fijar al crear la sesión.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET,
            )
        except (ValueError, stripe.SignatureVerificationError):
            return HttpResponse(status=400)

        if event['type'] == 'checkout.session.completed':
            session_data = event['data']['object']
            metadata = stripe_dict_get(session_data, 'metadata', {})
            tipo = stripe_dict_get(metadata, 'tipo')

            try:
                if tipo == 'compra_carrito':
                    marcar_orden_pagada(session_data['id'])
                elif tipo in TIPOS_ACTIVACION_USUARIO:
                    activar_suscripcion_usuario(session_data)
                elif tipo in TIPOS_COMISION:
                    marcar_comision_pagada(session_data['id'])
                else:
                    print(f"Webhook: checkout.session.completed con metadata.tipo desconocido: {tipo!r}")
            except Exception as e:
                # Atrapamos cualquier error interno para evitar que Stripe
                # reintente infinitamente el mismo evento.
                print(f"Error procesando checkout.session.completed: {e}")
                return HttpResponse(status=500)

        return HttpResponse(status=200)
