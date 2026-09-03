from django.db import transaction

from orders.models import Orden


@transaction.atomic
def marcar_comision_pagada(session_id):
    """
    Marca como pagada la Orden que respalda una comisión (Motion o Modelo)
    cuando Stripe confirma el pago (checkout.session.completed). Idempotente.

    A diferencia de shopping_cart.services.marcar_orden_pagada, esto NO toca
    el carrito ni ComprasDigitales: la comisión ya tiene su propio archivo de
    entrega (ComisionMotion/ComisionModelo.archivo_entrega), que el admin
    sube más adelante cuando termina el trabajo.
    """
    try:
        orden = Orden.objects.select_for_update().get(stripe_session_id=session_id)
    except Orden.DoesNotExist:
        return

    if orden.estado_pago == Orden.EstadoPago.COMPLETADO:
        return

    orden.estado_pago = Orden.EstadoPago.COMPLETADO
    orden.save(update_fields=['estado_pago'])
