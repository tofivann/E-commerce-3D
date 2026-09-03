from django.conf import settings
from django.db import transaction

from core.email_utils import enviar_email
from orders.models import Orden, ComprasDigitales
from .models import CarritoItem


@transaction.atomic
def marcar_orden_pagada(session_id):
    """
    Otorga las ComprasDigitales de una Orden y vacía el carrito del
    comprador cuando Stripe confirma el pago (checkout.session.completed).
    Idempotente: Stripe puede reenviar el mismo evento varias veces.
    """
    try:
        orden = Orden.objects.select_for_update().get(stripe_session_id=session_id)
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
