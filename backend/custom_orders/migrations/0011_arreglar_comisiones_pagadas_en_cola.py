from django.db import migrations


def avanzar_comisiones_ya_pagadas(apps, schema_editor):
    """
    Antes de esta versión, el pago de una comisión (webhook de Stripe/captura
    de PayPal) marcaba Orden.estado_pago=COMPLETADO pero nunca tocaba
    ComisionMotion/ComisionModelo.estado — se quedaba en SOLICITADO ("En
    cola") para siempre hasta que un admin la cambiara a mano. Esta migración
    corrige, una sola vez, las filas ya pagadas que quedaron atascadas así;
    de aquí en adelante la transición es automática (ver
    custom_orders/services.py::_marcar_comision_pagada_db).
    """
    ComisionMotion = apps.get_model('custom_orders', 'ComisionMotion')
    ComisionModelo = apps.get_model('custom_orders', 'ComisionModelo')

    ComisionMotion.objects.filter(
        estado='SOLICITADO', orden__estado_pago='COMPLETADO',
    ).update(estado='EN_PROCESO')
    ComisionModelo.objects.filter(
        estado='SOLICITADO', orden__estado_pago='COMPLETADO',
    ).update(estado='EN_PROCESO')


def revertir(apps, schema_editor):
    # No hay forma de saber cuáles de las filas ahora EN_PROCESO fueron
    # tocadas por esta migración vs. avanzadas normalmente después — no se
    # revierte nada (igual que otras migraciones de datos de este proyecto).
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('custom_orders', '0010_quitar_categoria_fk'),
    ]

    operations = [
        migrations.RunPython(avanzar_comisiones_ya_pagadas, revertir),
    ]
