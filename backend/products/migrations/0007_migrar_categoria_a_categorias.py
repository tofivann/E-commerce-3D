from django.db import migrations


def copiar_categoria_a_categorias(apps, schema_editor):
    Producto = apps.get_model('products', 'Producto')
    for producto in Producto.objects.all():
        if producto.categoria_id:
            producto.categorias.add(producto.categoria_id)


def copiar_categorias_a_categoria(apps, schema_editor):
    Producto = apps.get_model('products', 'Producto')
    for producto in Producto.objects.all():
        primera = producto.categorias.first()
        if primera:
            producto.categoria_id = primera.id
            producto.save(update_fields=['categoria'])


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0006_agregar_categorias_m2m'),
    ]

    operations = [
        migrations.RunPython(copiar_categoria_a_categorias, copiar_categorias_a_categoria),
    ]
