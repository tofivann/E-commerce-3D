from django.apps import apps
from django.core.management.base import BaseCommand
from django.db.models import Q

from core.miniaturas import ConMiniaturas


class Command(BaseCommand):
    """
    Crea las miniaturas que faltan en todos los modelos que las usan
    (los que heredan de core.miniaturas.ConMiniaturas: productos y
    comisiones): las filas que existian antes de que las miniaturas se
    generaran solas al guardar.

    Se puede interrumpir y volver a correr: cada fila se guarda al terminar
    y solo se procesan las que faltan. No toca las imagenes originales.

    Los mensajes van sin acentos a proposito: la consola del servidor puede
    estar en ASCII (ver la nota de despliegue en CLAUDE.md).
    """

    help = "Genera las miniaturas que faltan (o todas con --rehacer)."

    def add_arguments(self, parser):
        parser.add_argument('--limite', type=int, default=None, help="Procesar como mucho N filas por cada imagen.")
        parser.add_argument('--rehacer', action='store_true', help="Rehacer tambien las que ya existen.")

    def handle(self, *args, **opciones):
        modelos = [m for m in apps.get_models() if issubclass(m, ConMiniaturas)]
        for modelo in sorted(modelos, key=lambda m: m._meta.label):
            for origen, destino in modelo.MINIATURAS.items():
                self.procesar(modelo, origen, destino, opciones['limite'], opciones['rehacer'])

    def procesar(self, modelo, origen, destino, limite, rehacer):
        filas = modelo.objects.exclude(**{origen: ''}).exclude(**{f'{origen}__isnull': True}).order_by('pk')
        if not rehacer:
            filas = filas.filter(Q(**{destino: ''}) | Q(**{f'{destino}__isnull': True}))
        ids = list(filas.values_list('pk', flat=True)[:limite])
        nombre = f"{modelo._meta.label}.{origen}"
        self.stdout.write(f"{nombre}: {len(ids)} por procesar")

        hechas, fallidas = 0, []
        for numero, pk in enumerate(ids, start=1):
            fila = modelo.objects.get(pk=pk)
            anterior = fila.generar_miniatura(origen)
            fila.save(update_fields=[destino])
            miniatura = getattr(fila, destino)
            if anterior and anterior != miniatura.name:
                miniatura.storage.delete(anterior)
            if miniatura:
                hechas += 1
            else:
                fallidas.append(pk)
            if numero % 100 == 0:
                self.stdout.write(f"  {numero}/{len(ids)}")

        self.stdout.write(self.style.SUCCESS(f"{nombre}: {hechas} miniaturas creadas"))
        if fallidas:
            self.stdout.write(self.style.WARNING(
                f"{nombre}: sin miniatura (imagen ilegible o ausente), ids: {fallidas}. Se sigue mostrando la original."
            ))
