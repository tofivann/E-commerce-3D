import uuid

from django.conf import settings
from django.db import transaction

from core.email_utils import enviar_email
from core.idiomas import EN, ES
from monedas.reglas import NOMBRE_MONEDAS, PASARELA_MONEDAS
from monedas.services import cobrar_orden, otorgar_por_orden_pagada
from orders.models import Orden, DetalleOrden, ComprasDigitales
from .models import CarritoItem


class CarritoNoPagableConMonedas(Exception):
    """El carrito no se puede pagar con monedas; el mensaje va al usuario."""


def _entregar_orden(orden):
    """Lo que pasa cuando una orden del catálogo queda pagada, sea con dinero
    o con monedas: se dan los permisos de descarga, la orden pasa a
    COMPLETADO y se vacía el carrito. Se llama dentro de una transacción."""
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


@transaction.atomic
def _marcar_orden_pagada_db(lookup):
    """Solo la parte de base de datos, en su propia transacción corta. Devuelve
    la Orden recién pagada, o None si no existía o ya estaba COMPLETADO."""
    try:
        orden = Orden.objects.select_for_update().get(**lookup)
    except Orden.DoesNotExist:
        return None

    if orden.estado_pago == Orden.EstadoPago.COMPLETADO:
        return None

    _entregar_orden(orden)
    # Una moneda por cada producto comprado con dinero (monedas/reglas.py).
    otorgar_por_orden_pagada(orden)
    return orden


def _enviar_recibo(orden):
    enviar_email(
        to=orden.usuario.email,
        asuntos={ES: "Recibo de tu compra ✨", EN: "Your purchase receipt ✨"},
        template_name='shopping_cart/email_recibo_compra.html',
        context={
            'codigo_orden': orden.codigo_orden,
            'detalles': list(orden.detalles.select_related('producto')),
            'total': orden.total,
            # Solo en una orden pagada con monedas: la plantilla muestra
            # entonces monedas en vez de dólares.
            'total_monedas': orden.total_monedas,
            'frontend_url': settings.FRONTEND_URL,
        },
        idioma=orden.usuario.idioma,
    )


@transaction.atomic
def _pagar_carrito_con_monedas_db(usuario):
    """Crea la orden del carrito, la cobra en monedas y la entrega, todo o
    nada. Lanza `CarritoNoPagableConMonedas` o `SaldoInsuficiente`."""
    items = list(CarritoItem.objects.filter(carrito__usuario=usuario).select_related('producto'))
    if not items:
        raise CarritoNoPagableConMonedas('El carrito está vacío.')
    sin_precio = [item.producto.titulo for item in items if not item.producto.precio_monedas]
    if sin_precio:
        raise CarritoNoPagableConMonedas(
            f'Estos productos no se pueden pagar con {NOMBRE_MONEDAS}: ' + ', '.join(sin_precio) + '.'
        )

    orden = Orden.objects.create(
        codigo_orden=f"ORD-{uuid.uuid4().hex[:10].upper()}",
        usuario=usuario,
        total=0,
        total_monedas=sum(item.producto.precio_monedas for item in items),
        estado_pago=Orden.EstadoPago.PENDIENTE,
        tipo_orden=Orden.TipoOrden.CATALOGO,
        pasarela_pago=PASARELA_MONEDAS,
    )
    for item in items:
        DetalleOrden.objects.create(
            orden=orden, producto=item.producto, precio_unitario=0, precio_monedas=item.producto.precio_monedas,
        )

    cobrar_orden(orden)
    _entregar_orden(orden)
    return orden


def pagar_carrito_con_monedas(usuario):
    """Paga con monedas el carrito entero de `usuario` (no se mezcla con
    dinero) y devuelve la Orden ya completada. No da monedas. Lanza
    `CarritoNoPagableConMonedas` o `monedas.services.SaldoInsuficiente`.

    Igual que en `marcar_orden_pagada`, el recibo sale fuera de la
    transacción: un correo lento no puede revertir la compra."""
    orden = _pagar_carrito_con_monedas_db(usuario)
    _enviar_recibo(orden)
    return orden


def marcar_orden_pagada(session_id=None, paypal_order_id=None):
    """
    Otorga las ComprasDigitales de una Orden y vacía el carrito del
    comprador cuando se confirma el pago (webhook de Stripe o captura de
    PayPal). Idempotente: ambas pasarelas pueden reintentar/reenviar.

    El guardado en base de datos y el envío del correo están deliberadamente
    separados (no en una sola @transaction.atomic): el correo puede tardar o
    fallar (ver core/email_utils.py) y NUNCA debe poder tumbar ni revertir el
    pago ya otorgado.
    """
    lookup = {'stripe_session_id': session_id} if session_id else {'paypal_order_id': paypal_order_id}
    orden = _marcar_orden_pagada_db(lookup)
    if orden is None:
        return

    _enviar_recibo(orden)
