from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from core import paypal_utils
from orders.models import Orden

UMBRAL_HORAS_ABANDONO = 3


class Command(BaseCommand):
    """
    A diferencia de Stripe (donde checkout.session.expired nos avisa cuando
    el cliente abandona sin pagar), PayPal no manda ningún aviso equivalente
    — la captura es activa desde el frontend (onApprove), así que si el
    comprador cierra el popup sin aprobar, nuestro sistema nunca se entera.
    Este comando es el único mecanismo de limpieza para ese caso: no hay
    evento que escuchar, solo un timeout que definimos nosotros mismos
    (UMBRAL_HORAS_ABANDONO) y una verificación contra la API de PayPal antes
    de cancelar, para nunca cancelar un pago que sí se haya completado.

    Pensado para correr por cron (cPanel > Cron Jobs), no vía webhook.
    """

    help = (
        "Revisa las Ordenes de PayPal que quedaron PENDIENTE por más de "
        f"{UMBRAL_HORAS_ABANDONO}h sin captura, confirma su estado real contra "
        "la API de PayPal, y cancela las que de verdad nunca se pagaron."
    )

    def handle(self, *args, **options):
        from custom_orders.services import marcar_comision_pagada
        from shopping_cart.services import marcar_orden_pagada

        limite = timezone.now() - timedelta(hours=UMBRAL_HORAS_ABANDONO)
        candidatas = Orden.objects.filter(
            pasarela_pago='PayPal',
            estado_pago=Orden.EstadoPago.PENDIENTE,
            paypal_order_id__isnull=False,
            fecha_orden__lt=limite,
        )

        canceladas = recuperadas = sin_cambio = errores = 0

        for orden in candidatas:
            try:
                datos = paypal_utils.consultar_orden(orden.paypal_order_id)
            except paypal_utils.PayPalError as e:
                self.stderr.write(f"Orden {orden.id}: error consultando PayPal: {e}")
                errores += 1
                continue

            estado_paypal = datos.get('status')

            if estado_paypal == 'COMPLETED':
                # El comprador sí pagó, pero nuestro sistema nunca lo
                # procesó (ej. un crash justo después de la captura) — se
                # recupera exactamente igual que "Forzar marcar como
                # PAGADA": nunca se cancela un pago que de verdad ocurrió.
                if orden.tipo_orden == Orden.TipoOrden.CATALOGO:
                    marcar_orden_pagada(paypal_order_id=orden.paypal_order_id)
                else:
                    marcar_comision_pagada(paypal_order_id=orden.paypal_order_id)
                recuperadas += 1
            elif estado_paypal in ('CREATED', 'APPROVED', 'VOIDED'):
                # El comprador nunca terminó de pagar — abandono real.
                orden.estado_pago = Orden.EstadoPago.CANCELADO
                orden.save(update_fields=['estado_pago'])
                canceladas += 1
            else:
                sin_cambio += 1

        self.stdout.write(
            f"PayPal: {canceladas} cancelada(s), {recuperadas} recuperada(s) "
            f"(ya estaban pagadas y no se sabía), {sin_cambio} sin cambio, "
            f"{errores} error(es) de conexión."
        )
