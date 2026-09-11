from django.db import migrations, models
import django.db.models.deletion


def sembrar_categorias_y_asignar(apps, schema_editor):
    Categoria = apps.get_model('products', 'Categoria')
    Producto = apps.get_model('products', 'Producto')

    modelo, _ = Categoria.objects.get_or_create(nombre='Modelo')
    Categoria.objects.get_or_create(nombre='Motion')
    Categoria.objects.get_or_create(nombre='Juego')

    Producto.objects.filter(categoria__isnull=True).update(categoria=modelo)


def revertir_seed(apps, schema_editor):
    Categoria = apps.get_model('products', 'Categoria')
    Categoria.objects.filter(nombre__in=['Modelo', 'Motion', 'Juego']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0003_producto_link_youtube'),
    ]

    operations = [
        migrations.CreateModel(
            name='Categoria',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100, unique=True)),
                ('activo', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Categoría',
                'verbose_name_plural': 'Categorías',
                'ordering': ['nombre'],
            },
        ),
        migrations.AddField(
            model_name='producto',
            name='categoria',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name='productos', to='products.categoria'),
        ),
        migrations.RunPython(sembrar_categorias_y_asignar, revertir_seed),
        migrations.AlterField(
            model_name='producto',
            name='categoria',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='productos', to='products.categoria'),
        ),
    ]
