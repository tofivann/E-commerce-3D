from .models import Orden


def marcar_orden_expirada(session_id):
    """
    Cancela una Orden cuya Stripe Checkout Session expiró sin que el cliente
    completara el pago (evento checkout.session.expired, ~24h después de
    crearla sin pagar). Sirve tanto para compras del carrito como para
    comisiones — ambas usan el mismo modelo Orden y no necesitan lógica
    distinta para cancelar (a diferencia de marcar_orden_pagada/
    marcar_comision_pagada, que sí difieren en qué otorgan al confirmar).

    Solo actúa si la Orden sigue en PENDIENTE, para no pisar un pago que ya
    se hubiera confirmado justo antes de que llegara este evento.
    """
    Orden.objects.filter(
        stripe_session_id=session_id,
        estado_pago=Orden.EstadoPago.PENDIENTE,
    ).update(estado_pago=Orden.EstadoPago.CANCELADO)
