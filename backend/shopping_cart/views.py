import uuid
from decimal import Decimal

import stripe
from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Orden, DetalleOrden, ComprasDigitales
from orders.serializers import OrdenSerializer
from products.models import Producto
from .models import Carrito, CarritoItem
from .serializers import CarritoSerializer, TASA_IMPUESTO

stripe.api_key = settings.STRIPE_SECRET_KEY


def _obtener_carrito(usuario):
    carrito, _ = Carrito.objects.get_or_create(usuario=usuario)
    return carrito


class MiCarritoView(APIView):
    """Devuelve el carrito del usuario autenticado (lo crea si no existe)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        carrito = _obtener_carrito(request.user)
        return Response(CarritoSerializer(carrito, context={'request': request}).data)


class CarritoItemView(APIView):
    """Agrega o elimina un producto del carrito del usuario autenticado."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        producto_id = request.data.get('producto')
        producto = get_object_or_404(Producto, pk=producto_id, activo=True)
        carrito = _obtener_carrito(request.user)
        CarritoItem.objects.get_or_create(carrito=carrito, producto=producto)
        return Response(
            CarritoSerializer(carrito, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, item_id):
        carrito = _obtener_carrito(request.user)
        item = get_object_or_404(CarritoItem, pk=item_id, carrito=carrito)
        item.delete()
        return Response(CarritoSerializer(carrito, context={'request': request}).data)


class CheckoutView(APIView):
    """
    Crea una Orden (PENDIENTE) a partir del carrito y una Stripe Checkout
    Session para cobrarla, y devuelve la URL de pago hospedada por Stripe.

    Importante: esta vista NO otorga acceso a los productos ni vacía el
    carrito. Eso solo ocurre en StripeWebhookView, cuando Stripe confirma
    que el pago se completó realmente — nunca hay que confiar en que el
    usuario llegó a la pantalla de "pago exitoso" para dar por hecha la venta.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        carrito = _obtener_carrito(request.user)
        items = list(carrito.items.select_related('producto'))
        if not items:
            return Response(
                {"detail": "El carrito está vacío."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subtotal = sum((item.producto.precio for item in items))
        impuestos = (subtotal * TASA_IMPUESTO).quantize(Decimal('0.01'))
        total = subtotal + impuestos

        orden = Orden.objects.create(
            codigo_orden=f"ORD-{uuid.uuid4().hex[:10].upper()}",
            usuario=request.user,
            total=total,
            estado_pago=Orden.EstadoPago.PENDIENTE,
            tipo_orden=Orden.TipoOrden.CATALOGO,
            pasarela_pago="Stripe",
        )
        for item in items:
            DetalleOrden.objects.create(
                orden=orden,
                producto=item.producto,
                precio_unitario=item.producto.precio,
            )

        # Un line_item de Stripe por producto, más uno para el impuesto del 8%
        # (el mismo que se muestra en el carrito) para que el monto cobrado
        # coincida exactamente con el total mostrado al usuario.
        line_items = [
            {
                'price_data': {
                    'currency': 'usd',
                    'unit_amount': int(item.producto.precio * 100),
                    'product_data': {'name': item.producto.titulo},
                },
                'quantity': 1,
            }
            for item in items
        ]
        line_items.append({
            'price_data': {
                'currency': 'usd',
                'unit_amount': int(impuestos * 100),
                'product_data': {'name': 'Impuestos (8%)'},
            },
            'quantity': 1,
        })

        try:
            session = stripe.checkout.Session.create(
                mode='payment',
                payment_method_types=['card'],
                line_items=line_items,
                success_url=(
                    f"{settings.FRONTEND_URL}/pago-completado"
                    "?session_id={CHECKOUT_SESSION_ID}"
                ),
                cancel_url=f"{settings.FRONTEND_URL}/",
                client_reference_id=str(request.user.id),
                metadata={'orden_id': str(orden.id)},
            )
        except stripe.StripeError as e:
            # @transaction.atomic solo revierte si la excepción se propaga; como la
            # atrapamos aquí para devolver un error controlado, hay que forzar el
            # rollback explícitamente o la Orden/DetalleOrden quedarían huérfanos.
            transaction.set_rollback(True)
            return Response(
                {"detail": f"No se pudo iniciar el pago con Stripe: {e.user_message or str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        orden.stripe_session_id = session.id
        orden.save(update_fields=['stripe_session_id'])

        return Response({"checkout_url": session.url}, status=status.HTTP_201_CREATED)


class StripeWebhookView(APIView):
    """
    Recibe los eventos de Stripe. Verifica la firma con STRIPE_WEBHOOK_SECRET
    (nunca se procesa un payload sin verificar: cualquiera podría simular un
    pago exitoso). Cuando el evento es 'checkout.session.completed', otorga
    las ComprasDigitales de esa orden y vacía el carrito del comprador.
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
            self._marcar_orden_pagada(event['data']['object']['id'])

        return HttpResponse(status=200)

    @transaction.atomic
    def _marcar_orden_pagada(self, session_id):
        try:
            orden = Orden.objects.select_for_update().get(stripe_session_id=session_id)
        except Orden.DoesNotExist:
            return

        if orden.estado_pago == Orden.EstadoPago.COMPLETADO:
            return  # Idempotencia: Stripe puede reenviar el mismo evento varias veces.

        for detalle in orden.detalles.select_related('producto'):
            if detalle.producto is None:
                continue  # El producto fue eliminado entre el checkout y el pago.
            ComprasDigitales.objects.get_or_create(
                usuario=orden.usuario,
                producto=detalle.producto,
                orden=orden,
            )

        orden.estado_pago = Orden.EstadoPago.COMPLETADO
        orden.save(update_fields=['estado_pago'])

        CarritoItem.objects.filter(carrito__usuario=orden.usuario).delete()


class OrdenPorSesionView(generics.RetrieveAPIView):
    """
    Consulta el estado de una orden por su Stripe session_id. La usa la
    pantalla de "Pago Completado" para mostrar (o esperar) la confirmación.
    """
    serializer_class = OrdenSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'stripe_session_id'
    lookup_url_kwarg = 'session_id'

    def get_queryset(self):
        return Orden.objects.filter(usuario=self.request.user)
