from rest_framework import filters

from core.text_utils import normalizar_texto


class BusquedaNormalizadaFilter(filters.SearchFilter):
    """SearchFilter de DRF, pero normalizando lo que escribe el usuario igual
    que las columnas *_normalizado del modelo (sin acentos, minúsculas).

    El viewset declara en `search_fields` las columnas normalizadas; así
    "pelicula" encuentra "Película" en SQLite y en Postgres por igual. Cada
    palabra del término se busca por separado y todas deben aparecer (en
    cualquiera de los campos), que es el comportamiento estándar de DRF.
    """

    def get_search_terms(self, request):
        return [normalizar_texto(t) for t in super().get_search_terms(request) if normalizar_texto(t)]


class CategoriasFilter(filters.BaseFilterBackend):
    """Filtra por ?categorias=1,2,3 (ids separados por coma): el producto
    tiene que pertenecer a TODAS las categorías pedidas (AND) — seleccionar
    "Motion" y "Modelo" devuelve solo lo que es ambas cosas, no lo que es
    cualquiera de las dos. Misma semántica que aplica DigitalLibrary en el
    navegador sobre su lista no paginada. Ids no numéricos y repetidos se
    ignoran en silencio.
    """
    parametro = 'categorias'

    def filter_queryset(self, request, queryset, view):
        crudo = request.query_params.get(self.parametro, '')
        ids = {int(x) for x in crudo.split(',') if x.strip().isdigit()}
        # Un .filter() encadenado por categoría: cada uno agrega su propio
        # join al M2M, así que las condiciones se exigen a la vez. Un solo
        # .filter(categorias__in=ids) sería OR ("alguna de estas"), y de
        # paso, al haber un join por id, cada producto sale una sola vez —
        # no hace falta distinct().
        for categoria_id in ids:
            queryset = queryset.filter(categorias=categoria_id)
        return queryset
