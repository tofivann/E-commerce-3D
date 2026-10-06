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


class TiendaFilter(filters.BaseFilterBackend):
    """Filtra por ?tienda=dinero|monedas: qué tienda está mirando el cliente.
    La tienda normal muestra lo que acepta dinero y la "Tienda MimiCoins" lo
    que acepta MimiCoins: un producto que acepta las dos sale en ambas. Sin
    el parámetro (o con un valor desconocido) no se filtra: el panel del
    admin lista todo."""
    parametro = 'tienda'
    condiciones = {
        'dinero': {'acepta_dinero': True},
        'monedas': {'acepta_monedas': True},
    }

    def filter_queryset(self, request, queryset, view):
        condicion = self.condiciones.get(request.query_params.get(self.parametro, ''))
        return queryset.filter(**condicion) if condicion else queryset


class CategoriasFilter(filters.BaseFilterBackend):
    """Filtra por ?categorias=1,2,3 (ids separados por coma): el producto
    tiene que tener AL MENOS UNA de las categorías pedidas (OR). Cada
    etiqueta marcada amplía la lista: "Bang Dream" devuelve todo lo de ese
    juego, y añadir "Motion" suma todos los motions de cualquier juego.

    Historial, para no repetir el ir y venir: así fue originalmente; luego
    se probó "todas las marcadas" (AND), después coincidencia exacta
    (inservible: casi todo producto tiene dos etiquetas, marcar una sola no
    devolvía nada), otra vez AND, y el cliente final pidió volver a este
    OR. Misma semántica que aplican DigitalLibrary y el filtro de
    comisiones del admin en el navegador sobre sus listas no paginadas
    (frontend/src/utils/categoria.ts::tieneAlgunaCategoria). Ids no
    numéricos y repetidos se ignoran en silencio.
    """
    parametro = 'categorias'

    def filter_queryset(self, request, queryset, view):
        crudo = request.query_params.get(self.parametro, '')
        ids = {int(x) for x in crudo.split(',') if x.strip().isdigit()}
        if not ids:
            return queryset
        # Un solo join al M2M con IN = "alguna de estas". El distinct() es
        # obligatorio: un producto que está en dos de las categorías pedidas
        # sale una fila por cada una, lo que lo repetiría en la página y
        # descuadraría el count de la paginación.
        return queryset.filter(categorias__in=ids).distinct()
