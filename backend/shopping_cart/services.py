import uuid

from django.conf import settings
from django.db import transaction

from core.email_utils import enviar_email
from core.idiomas import EN, ES
from monedas.reglas import NOMBRE_MONEDAS, PASARELA_MONEDAS
from monedas.services import cobrar_orden, otorgar_por_orden_pagada
from orders.models import Orden, DetalleOrden, ComprasDigitales
from .models import Carrito, CarritoItem


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
def _pagar_productos_con_monedas_db(usuario, productos):
    """Crea una orden con `productos`, la cobra en monedas y la entrega,
    todo o nada. Lanza `CarritoNoPagableConMonedas` o `SaldoInsuficiente`."""
    if not productos:
        raise CarritoNoPagableConMonedas('El carrito está vacío.')
    no_pagables = [producto.titulo for producto in productos if not producto.pagable_con_monedas]
    if no_pagables:
        raise CarritoNoPagableConMonedas(
            f'Estos productos no se pueden pagar con {NOMBRE_MONEDAS}: ' + ', '.join(no_pagables) + '.'
        )

    orden = Orden.objects.create(
        codigo_orden=f"ORD-{uuid.uuid4().hex[:10].upper()}",
        usuario=usuario,
        total=0,
        total_monedas=sum(producto.precio_monedas for producto in productos),
        estado_pago=Orden.EstadoPago.PENDIENTE,
        tipo_orden=Orden.TipoOrden.CATALOGO,
        pasarela_pago=PASARELA_MONEDAS,
    )
    for producto in productos:
        DetalleOrden.objects.create(
            orden=orden, producto=producto, precio_unitario=0, precio_monedas=producto.precio_monedas,
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
    items = CarritoItem.objects.filter(carrito__usuario=usuario).select_related('producto')
    orden = _pagar_productos_con_monedas_db(usuario, [item.producto for item in items])
    _enviar_recibo(orden)
    return orden


def canjear_producto_con_monedas(usuario, producto):
    """Canje directo de UN producto con MimiCoins, sin pasar por el carrito:
    es como se compran los productos solo-MimiCoins (los de la "Tienda
    MimiCoins"). Un producto que ya está en su biblioteca no se canjea dos
    veces. Devuelve la Orden ya completada; el carrito queda como estaba
    (`_entregar_orden` lo vacía: se guarda y se repone)."""
    if ComprasDigitales.objects.filter(usuario=usuario, producto=producto, activo=True).exists():
        raise CarritoNoPagableConMonedas('Ya tienes este producto en tu biblioteca.')
    productos_en_carrito = list(
        CarritoItem.objects.filter(carrito__usuario=usuario).values_list('producto_id', flat=True)
    )
    with transaction.atomic():
        orden = _pagar_productos_con_monedas_db(usuario, [producto])
        carrito = Carrito.objects.get(usuario=usuario) if productos_en_carrito else None
        for producto_id in productos_en_carrito:
            CarritoItem.objects.get_or_create(carrito=carrito, producto_id=producto_id)
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
