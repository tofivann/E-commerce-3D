from django.db import transaction

from .models import Orden


@transaction.atomic
def marcar_orden_expirada(session_id):
    """
    Cancela una Orden cuya Stripe Checkout Session expiró sin que el cliente
    completara el pago (evento checkout.session.expired, ~24h después de
    crearla sin pagar). Sirve tanto para compras del carrito como para
    comisiones — ambas usan el mismo modelo Orden. La única diferencia es
    que una comisión tiene además su propia fila con estado propio, y esa
    también hay que cancelarla (custom_orders/services.py::
    cancelar_comision_por_abandono); antes solo se cancelaba la Orden y la
    comisión se quedaba en SOLICITADO para siempre.

    Solo actúa si la Orden sigue en PENDIENTE, para no pisar un pago que ya
    se hubiera confirmado justo antes de que llegara este evento. Devuelve
    la Orden cancelada, o None si no había nada que cancelar.
    """
    # Import local: custom_orders.services importa orders.models, y este
    # módulo es orders.services — se evita el ciclo al cargar (mismo patrón
    # que el cron cancelar_ordenes_paypal_expiradas).
    from custom_orders.services import cancelar_comision_por_abandono

    orden = Orden.objects.select_for_update().filter(
        stripe_session_id=session_id,
        estado_pago=Orden.EstadoPago.PENDIENTE,
    ).first()
    if orden is None:
        return None

    orden.estado_pago = Orden.EstadoPago.CANCELADO
    orden.save(update_fields=['estado_pago'])
    cancelar_comision_por_abandono(orden)
    return orden
