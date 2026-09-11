from django.db import migrations, models

TRADUCCIONES = {'Modelo': 'Model', 'Motion': 'Motion', 'Juego': 'Game'}


def traducir_categorias_existentes(apps, schema_editor):
    Categoria = apps.get_model('products', 'Categoria')
    for categoria in Categoria.objects.filter(nombre_en=''):
        categoria.nombre_en = TRADUCCIONES.get(categoria.nombre, categoria.nombre)
        categoria.save(update_fields=['nombre_en'])


def revertir_traduccion(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0004_categoria_producto_categoria'),
    ]

    operations = [
        migrations.AddField(
            model_name='categoria',
            name='nombre_en',
            field=models.CharField(default='', help_text='Nombre en inglés, para el sitio en modo EN.', max_length=100),
            preserve_default=False,
        ),
        migrations.RunPython(traducir_categorias_existentes, revertir_traduccion),
    ]
