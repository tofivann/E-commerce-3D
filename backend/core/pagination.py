from rest_framework.pagination import PageNumberPagination


class PaginacionEstandar(PageNumberPagination):
    """Paginación por número de página para listados grandes (catálogo).

    Respuesta: {"count", "next", "previous", "results"}. El cliente pide
    ?page=N y, opcionalmente, ?page_size=M hasta el máximo permitido — así
    el scroll infinito del frontend sigue `next` sin armar URLs a mano.

    No es el default global de DRF a propósito: los demás listados (carrito,
    biblioteca, conversaciones, tablas de precios) son cortos y sus
    consumidores esperan un array plano.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100
