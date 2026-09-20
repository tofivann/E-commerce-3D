import unicodedata

# Mismo rango que usa frontend/src/utils (marcas diacríticas combinantes en
# Unicode): tras descomponer con NFD, cada letra acentuada queda como
# (letra base + marca), y quitar la marca deja solo la letra base.
_MARCA_DIACRITICA_INICIO = 0x0300
_MARCA_DIACRITICA_FIN = 0x036F


def normalizar_texto(texto):
    """Quita acentos, pasa a minúsculas y recorta espacios, para comparar o
    buscar texto sin importar cómo se hayan escrito los acentos
    (ej. "pelicula" coincide con "Película").

    Es el espejo exacto de la normalización que el frontend aplicaba en el
    navegador; ahora que la búsqueda vive en el servidor, se calcula acá y se
    persiste en columnas *_normalizado de los modelos que la necesitan.
    """
    if not texto:
        return ''
    descompuesto = unicodedata.normalize('NFD', texto)
    sin_acentos = ''.join(
        c for c in descompuesto
        if not (_MARCA_DIACRITICA_INICIO <= ord(c) <= _MARCA_DIACRITICA_FIN)
    )
    return sin_acentos.lower().strip()
