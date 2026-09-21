from django.conf import settings
from django.db import transaction

from core.email_utils import enviar_email
from orders.models import Orden
from .models import EstadoComision


def _comision_de_orden(orden):
    """Relación inversa OneToOne de la Orden a su ComisionMotion/ComisionModelo,
    o None si la orden no respalda ninguna comisión (no debería pasar para las
    llamadas de este módulo, pero evita un AttributeError si alguna vez se
    llama con una orden equivocada)."""
    if hasattr(orden, 'comision_motion'):
        return orden.comision_motion
    if hasattr(orden, 'comision_modelo'):
        return orden.comision_modelo
    return None


def datos_comision_para_email(orden):
    """
    A partir de la Orden, averigua si la comisión asociada es de Motion o de
    Modelo (relación inversa OneToOne) y arma el (tipo_label, detalle) que
    usan las plantillas de correo — reutilizado tanto al confirmar el pago
    como al marcarla completada.
    """
    if hasattr(orden, 'comision_motion'):
        comision = orden.comision_motion
        return 'Comisión de Motion', f"{comision.nombre_cancion} ({comision.nombre_juego})"
    if hasattr(orden, 'comision_modelo'):
        comision = orden.comision_modelo
        return 'Comisión de Modelo Nuevo', f"{comision.nombre_personaje} ({comision.juego.nombre})"
    return 'Comisión', ''


@transaction.atomic
def _marcar_comision_pagada_db(lookup):
    """Solo la parte de base de datos, en su propia transacción corta. Devuelve
    la Orden recién pagada, o None si no existía o ya estaba COMPLETADO."""
    try:
        orden = Orden.objects.select_for_update().get(**lookup)
    except Orden.DoesNotExist:
        return None

    if orden.estado_pago == Orden.EstadoPago.COMPLETADO:
        return None

    orden.estado_pago = Orden.EstadoPago.COMPLETADO
    orden.save(update_fields=['estado_pago'])

    # Saltar "En cola" (SOLICITADO) por completo: en cuanto el pago se
    # confirma, el cliente ya no debería ver la comisión como "en cola" sino
    # como "en proceso" — antes esto se quedaba en SOLICITADO hasta que un
    # admin lo cambiara a mano en el panel. Solo se toca si sigue en
    # SOLICITADO (no pisa un CANCELADO manual ni un COMPLETADO ya hecho, por
    # si el webhook llega tarde o duplicado).
    comision = _comision_de_orden(orden)
    if comision is not None and comision.estado == EstadoComision.SOLICITADO:
        comision.estado = EstadoComision.EN_PROCESO
        comision.save(update_fields=['estado'])

    return orden


def marcar_comision_pagada(session_id=None, paypal_order_id=None):
    """
    Marca como pagada la Orden que respalda una comisión (Motion o Modelo)
    cuando se confirma el pago (webhook de Stripe o captura de PayPal).
    Idempotente.

    A diferencia de shopping_cart.services.marcar_orden_pagada, esto NO toca
    el carrito ni ComprasDigitales: la comisión ya tiene su propio archivo de
    entrega (ComisionMotion/ComisionModelo.archivo_entrega), que el admin
    sube más adelante cuando termina el trabajo.

    El guardado en base de datos y el envío del correo están deliberadamente
    separados (no en una sola @transaction.atomic): el correo puede tardar o
    fallar (ver core/email_utils.py) y NUNCA debe poder tumbar ni revertir el
    pago ya otorgado.
    """
    lookup = {'stripe_session_id': session_id} if session_id else {'paypal_order_id': paypal_order_id}
    orden = _marcar_comision_pagada_db(lookup)
    if orden is None:
        return

    tipo_label, detalle = datos_comision_para_email(orden)
    enviar_email(
        to=orden.usuario.email,
        subject="¡Recibimos tu pago! 🎨",
        template_name='custom_orders/email_comision_pagada.html',
        context={
            'codigo_orden': orden.codigo_orden,
            'tipo_label': tipo_label,
            'detalle': detalle,
            'total': orden.total,
            'frontend_url': settings.FRONTEND_URL,
        },
    )
