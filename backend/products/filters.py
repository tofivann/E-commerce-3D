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
    """Filtra por ?categorias=1,2,3 (ids separados por coma): coincide si el
    producto pertenece a CUALQUIERA de las categorías pedidas, igual que el
    filtro de chips del frontend. Ids no numéricos se ignoran en silencio.
    """
    parametro = 'categorias'

    def filter_queryset(self, request, queryset, view):
        crudo = request.query_params.get(self.parametro, '')
        ids = [int(x) for x in crudo.split(',') if x.strip().isdigit()]
        if not ids:
            return queryset
        # El join contra el M2M devuelve una fila por cada categoría que
        # coincide; sin distinct() un producto en dos categorías pedidas
        # aparecería dos veces (y rompería el conteo de la paginación).
        return queryset.filter(categorias__in=ids).distinct()
