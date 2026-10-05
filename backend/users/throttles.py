"""Límites por IP para los endpoints públicos del código de verificación.

Son la segunda barrera; la primera está en users/verificacion.py (espera
entre envíos al mismo correo, tope de intentos por código) y no depende de
caché. Estos evitan que una misma IP use el sitio para mandar códigos a
muchos correos distintos. Usan la caché de Django, que en producción es por
proceso, así que el límite real es aproximado: suficiente para frenar abuso,
no una garantía exacta.
"""
from rest_framework.throttling import AnonRateThrottle


class EnvioCodigoThrottle(AnonRateThrottle):
    scope = 'envio_codigo_registro'
    rate = '20/hour'


class ComprobacionCodigoThrottle(AnonRateThrottle):
    scope = 'comprobacion_codigo_registro'
    rate = '60/hour'
