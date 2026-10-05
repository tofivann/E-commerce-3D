from django.core.management.base import BaseCommand
from django.db.models import Q

from products.models import Producto


class Command(BaseCommand):
    """
    Crea la miniatura (Producto.imagen_miniatura) de los productos que tienen
    portada pero todavia no tienen miniatura: los que existian antes de que
    las miniaturas se generaran solas al guardar.

    Se puede interrumpir y volver a correr: cada producto se guarda al
    terminar y solo se procesan los que faltan. No toca la portada original.

    Los mensajes van sin acentos a proposito: la consola del servidor puede
    estar en ASCII (ver la nota de despliegue en CLAUDE.md).
    """

    help = "Genera las miniaturas que faltan de los productos (o todas con --rehacer)."

    def add_arguments(self, parser):
        parser.add_argument('--limite', type=int, default=None, help="Procesar como mucho N productos.")
        parser.add_argument('--rehacer', action='store_true', help="Rehacer tambien las que ya existen.")

    def handle(self, *args, **opciones):
        productos = Producto.objects.exclude(imagen_previa='').exclude(imagen_previa__isnull=True).order_by('id')
        if not opciones['rehacer']:
            productos = productos.filter(Q(imagen_miniatura='') | Q(imagen_miniatura__isnull=True))
        ids = list(productos.values_list('id', flat=True)[:opciones['limite']])
        self.stdout.write(f"Productos por procesar: {len(ids)}")

        hechas, fallidas = 0, []
        for numero, producto_id in enumerate(ids, start=1):
            producto = Producto.objects.get(pk=producto_id)
            anterior = producto.generar_miniatura()
            producto.save(update_fields=['imagen_miniatura'])
            if anterior and anterior != producto.imagen_miniatura.name:
                producto.imagen_miniatura.storage.delete(anterior)
            if producto.imagen_miniatura:
                hechas += 1
            else:
                fallidas.append(producto_id)
            if numero % 100 == 0:
                self.stdout.write(f"  {numero}/{len(ids)}")

        self.stdout.write(self.style.SUCCESS(f"Miniaturas creadas: {hechas}"))
        if fallidas:
            self.stdout.write(self.style.WARNING(
                f"Sin miniatura (portada ilegible o ausente), ids: {fallidas}. Sus tarjetas siguen usando la portada original."
            ))
