import json

import stripe
from django.conf import settings
from django.http import HttpResponse
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from shopping_cart.services import marcar_orden_pagada
from users.services import activar_suscripcion_usuario
from custom_orders.services import marcar_comision_pagada
from . import paypal_utils
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


class PayPalCapturarOrdenView(APIView):
    """
    Único punto de entrada para capturar una orden de PayPal de toda la
    plataforma (equivalente a StripeWebhookView, pero llamado directamente
    por el frontend desde onApprove en vez de por un webhook pasivo — ver
    core/paypal_utils.py y el plan de integración para el porqué esto es
    seguro sin firma: la única forma de que la captura devuelva COMPLETED es
    que el comprador real haya aprobado esa orden en su sesión de PayPal, y
    el tipo/monto se fijaron server-side al crearla, nunca se confía en nada
    que mande el cliente aquí más que el propio paypal_order_id).

    Verifica el estado de la captura una sola vez y enruta por el
    custom_id.tipo (el mismo 'tipo' que usa el metadata de Stripe) a la
    misma lógica de negocio ya usada por el webhook de Stripe.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        paypal_order_id = request.data.get('paypal_order_id')
        if not paypal_order_id:
            return Response({"detail": "Falta paypal_order_id."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            resultado = paypal_utils.capturar_orden(paypal_order_id)
        except paypal_utils.PayPalError as e:
            return Response({"detail": f"No se pudo capturar el pago: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

        if resultado.get('status') != 'COMPLETED':
            return Response({"detail": "El pago no se completó."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            custom_id = resultado['purchase_units'][0]['payments']['captures'][0]['custom_id']
            datos = json.loads(custom_id)
        except (KeyError, IndexError, ValueError) as e:
            print(f"Captura de PayPal {paypal_order_id} sin custom_id legible: {e}")
            return Response({"detail": "No se pudo interpretar la orden capturada."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        tipo = datos.get('tipo')
        try:
            if tipo == 'compra_carrito':
                marcar_orden_pagada(paypal_order_id=paypal_order_id)
            elif tipo in TIPOS_ACTIVACION_USUARIO:
                activar_suscripcion_usuario({'metadata': {'user_id': datos.get('user_id')}})
            elif tipo in TIPOS_COMISION:
                marcar_comision_pagada(paypal_order_id=paypal_order_id)
            else:
                print(f"Captura de PayPal con tipo desconocido: {tipo!r}")
        except Exception as e:
            print(f"Error procesando captura de PayPal {paypal_order_id}: {e}")
            return Response({"detail": "Error al procesar el pago."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"status": "ok", "tipo": tipo}, status=status.HTTP_200_OK)
