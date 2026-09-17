from django.db import migrations


def copiar_categoria_a_categorias(apps, schema_editor):
    ComisionMotion = apps.get_model('custom_orders', 'ComisionMotion')
    ComisionModelo = apps.get_model('custom_orders', 'ComisionModelo')
    for comision in ComisionMotion.objects.all():
        if comision.categoria_id:
            comision.categorias.add(comision.categoria_id)
    for comision in ComisionModelo.objects.all():
        if comision.categoria_id:
            comision.categorias.add(comision.categoria_id)


def copiar_categorias_a_categoria(apps, schema_editor):
    ComisionMotion = apps.get_model('custom_orders', 'ComisionMotion')
    ComisionModelo = apps.get_model('custom_orders', 'ComisionModelo')
    for comision in ComisionMotion.objects.all():
        primera = comision.categorias.first()
        if primera:
            comision.categoria_id = primera.id
            comision.save(update_fields=['categoria'])
    for comision in ComisionModelo.objects.all():
        primera = comision.categorias.first()
        if primera:
            comision.categoria_id = primera.id
            comision.save(update_fields=['categoria'])


class Migration(migrations.Migration):

    dependencies = [
        ('custom_orders', '0008_agregar_categorias_m2m'),
    ]

    operations = [
        migrations.RunPython(copiar_categoria_a_categorias, copiar_categorias_a_categoria),
    ]
