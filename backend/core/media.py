"""Qué archivos subidos se pueden pedir por su dirección (/media/...).

Todo lo que se sube vive en MEDIA_ROOT, pero no todo es público:

- Las IMÁGENES (portadas de productos, fotos de entrega, fotos de referencia)
  las pinta el navegador con un <img>, que no puede mandar el token de
  sesión: tienen que poder pedirse por su dirección, sin más.
- Los ARCHIVOS QUE SE VENDEN o se entregan (el 3D de un producto, la entrega
  de una comisión) NO se piden por dirección nunca. Solo salen por las
  vistas de descarga, que comprueban sesión y que el archivo le corresponde
  a quien lo pide: orders.DescargarCompraView, custom_orders
  .DescargarComision{Motion,Modelo}View, y las descargas de admin.

Por eso esta vista es una lista de PERMITIDOS, no de prohibidos: una carpeta
nueva queda cerrada hasta que alguien la añada aquí a propósito. Antes se
servía MEDIA_ROOT entero y cualquiera con la dirección bajaba un producto de
pago sin sesión.
"""
import posixpath

from django.conf import settings
from django.http import Http404
from django.views.static import serve

# Deben coincidir con los `upload_to` de los ImageField del proyecto
# (core/tests_media.py lo comprueba contra los modelos).
CARPETAS_PUBLICAS = (
    'productos_preview/',                 # Producto.imagen_previa
    'comisiones/motion/entrega/',         # ComisionMotion.foto_entrega (también portada al publicar)
    'comisiones/modelo/entrega/',         # ComisionModelo.foto_entrega
    'comisiones/modelo/referencias/',     # ComisionModelo.foto_referencia_1/2
    'perfiles/',                          # Usuario.foto_perfil
)


def es_publico(ruta):
    """True si `ruta` (relativa a MEDIA_ROOT) cae dentro de una carpeta pública.

    Se normaliza antes de comparar: sin eso, "productos_preview/../modelos_3d/x"
    empieza por una carpeta pública y apuntaría a un archivo de pago.
    """
    normalizada = posixpath.normpath(ruta.replace('\\', '/')).lstrip('/')
    return any(normalizada.startswith(carpeta) for carpeta in CARPETAS_PUBLICAS)


def servir_media(request, path):
    # 404 y no 403: no se confirma ni siquiera que el archivo exista.
    if not es_publico(path):
        raise Http404('No encontrado.')
    return serve(request, path, document_root=settings.MEDIA_ROOT)
