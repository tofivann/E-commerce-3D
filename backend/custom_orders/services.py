from django.conf import settings
from django.db import transaction

from core.email_utils import enviar_email
from orders.models import Orden


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
