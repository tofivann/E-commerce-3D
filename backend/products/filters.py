from rest_framework import filters

from core.text_utils import normalizar_texto

from .models import Categoria


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
    """Filtra por ?categorias=1,2,3 (ids separados por coma) con coincidencia
    EXACTA: el producto tiene que tener exactamente esas categorías, ni una
    más ni una menos. Marcar "Juego" devuelve solo lo que es únicamente
    Juego; lo que es "Juego + Modelo" aparece solo marcando las dos.

    Se eligió así (y no el AND inclusivo habitual, "tiene estas y quizá
    otras") porque al dueño le resultaba confuso ver productos con etiquetas
    que no había marcado. Misma semántica que aplican DigitalLibrary y el
    filtro de comisiones del admin en el navegador sobre sus listas no
    paginadas (frontend/src/utils/categoria.ts::coincideCategoriasExactas).
    Ids no numéricos y repetidos se ignoran en silencio.
    """
    parametro = 'categorias'

    def filter_queryset(self, request, queryset, view):
        crudo = request.query_params.get(self.parametro, '')
        ids = {int(x) for x in crudo.split(',') if x.strip().isdigit()}
        if not ids:
            return queryset

        # 1) Tiene TODAS las pedidas: un .filter() encadenado por categoría,
        #    cada uno con su propio join al M2M (un solo
        #    .filter(categorias__in=ids) sería "alguna de estas").
        for categoria_id in ids:
            queryset = queryset.filter(categorias=categoria_id)

        # 2) Y NINGUNA otra: fuera todo producto que tenga alguna categoría
        #    distinta de las pedidas. exclude() sobre un M2M significa
        #    "excluir si CUALQUIERA de sus categorías cumple", que es justo
        #    lo que se necesita; se resuelve con una subconsulta, sin
        #    GROUP BY, así que no interfiere con la paginación ni el count.
        otras_categorias = Categoria.objects.exclude(id__in=ids)
        return queryset.exclude(categorias__in=otras_categorias)
