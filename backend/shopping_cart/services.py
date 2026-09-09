from django.conf import settings
from django.db import transaction

from core.email_utils import enviar_email
from orders.models import Orden, ComprasDigitales
from .models import CarritoItem


@transaction.atomic
def marcar_orden_pagada(session_id=None, paypal_order_id=None):
    """
    Otorga las ComprasDigitales de una Orden y vacía el carrito del
    comprador cuando se confirma el pago (webhook de Stripe o captura de
    PayPal). Idempotente: ambas pasarelas pueden reintentar/reenviar.
    """
    lookup = {'stripe_session_id': session_id} if session_id else {'paypal_order_id': paypal_order_id}
    try:
        orden = Orden.objects.select_for_update().get(**lookup)
    except Orden.DoesNotExist:
        return

    if orden.estado_pago == Orden.EstadoPago.COMPLETADO:
        return

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

    enviar_email(
        to=orden.usuario.email,
        subject="Recibo de tu compra ✨",
        template_name='shopping_cart/email_recibo_compra.html',
        context={
            'codigo_orden': orden.codigo_orden,
            'detalles': list(orden.detalles.select_related('producto')),
            'total': orden.total,
            'frontend_url': settings.FRONTEND_URL,
        },
    )
