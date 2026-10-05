"""Idiomas en que el sitio habla con sus usuarios (hoy, los correos).

La interfaz (frontend) es bilingüe ES/EN. El frontend manda el idioma activo
en la cabecera estándar `Accept-Language` de cada petición; con eso el
servidor sabe en qué idioma está viendo el sitio quien hace la petición
(`idioma_de_peticion`) y lo recuerda en `Usuario.idioma` para cuando haya que
escribirle sin que esté presente (ver users/authentication.py).
"""
from django.utils.translation.trans_real import parse_accept_lang_header

ES = 'es'
EN = 'en'
IDIOMAS = (ES, EN)
IDIOMA_POR_DEFECTO = ES
OPCIONES_IDIOMA = [(ES, 'Español'), (EN, 'English')]


def normalizar_idioma(valor):
    """'en', 'en-US', 'EN_us' → 'en'; lo que no sea un idioma soportado → None."""
    base = str(valor or '').strip().lower().replace('_', '-').split('-')[0]
    return base if base in IDIOMAS else None


def idioma_de_peticion(request):
    """Idioma en que quien hace la petición está viendo el sitio, o None si
    la petición no lo dice (sin cabecera, o solo idiomas no soportados).

    Respeta el orden de preferencia de `Accept-Language` ("fr, en;q=0.8" →
    'en'): el frontend manda un solo idioma, pero un navegador sin nuestro
    frontend manda su lista.
    """
    cabecera = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
    for etiqueta, _calidad in parse_accept_lang_header(cabecera):
        idioma = normalizar_idioma(etiqueta)
        if idioma:
            return idioma
    return None
