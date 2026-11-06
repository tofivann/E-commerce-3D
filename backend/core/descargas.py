"""Descarga de los archivos que se venden o se entregan: el 3D de un producto
y la entrega de una comisión. Esta es la ÚNICA salida de esos archivos (por
dirección /media/... nunca salen, ver core/media.py).

Son archivos grandes (100 MB y más) y el comprador puede estar al otro lado
del mundo, así que la descarga va en dos pasos:

1. La página pide, CON sesión, un enlace: GET .../descargar/ (las vistas de
   orders, custom_orders y products llaman a `enlace_de_descarga`). Se
   comprueba el derecho —es su compra, su comisión, o es staff— y se responde
   una dirección firmada, atada a ese archivo y a ese usuario, válida
   DESCARGA_ENLACE_SEGUNDOS.
2. El navegador abre esa dirección como una descarga normal, SIN sesión
   (`DescargaFirmadaView`): se verifica la firma, se vuelve a comprobar el
   derecho (si lo perdió, 404 aunque el enlace no haya caducado) y se envía el
   archivo.

Así la descarga aparece en la barra del navegador desde el primer byte, con
progreso, y se puede reanudar. Antes la página bajaba el archivo entero en
memoria (axios, blob) sin que el navegador supiera nada; si se cortaba a la
mitad solo quedaba "No se pudo descargar el archivo".

Quién envía los bytes (`respuesta_con_archivo`): con DESCARGA_DIRECTA_URL
configurado (producción), Django responde solo las cabeceras y
`X-LiteSpeed-Location`, y LiteSpeed sirve el archivo desde disco él mismo,
con soporte de Range. No ocupa un worker de Python durante los minutos que
dura la descarga: con 8 workers y entregas de 110 MB, eso dejaba la API sin
workers y las descargas se cortaban ("OSError: LSAPI: File error" en
stderr.log). Sin configurar (desarrollo, tests), Django envía el archivo con
FileResponse.

El enlace vale una hora y no es de un solo uso a propósito: reanudar una
descarga es volver a pedir la misma dirección con Range.
"""
import os
from urllib.parse import quote

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.http import FileResponse, Http404, HttpResponse
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils.http import content_disposition_header
from django.views import View

from custom_orders.models import ComisionModelo, ComisionMotion
from orders.models import ComprasDigitales
from products.models import Producto

SAL_FIRMA = 'core.descargas'


# --- Quién puede bajar qué -------------------------------------------------
# Cada resolutor recibe (usuario, pk) y devuelve el FieldFile, o lanza Http404.
# Se ejecutan dos veces: al pedir el enlace y al abrirlo.

def _solo_staff(usuario):
    if not usuario.is_staff:
        raise Http404('No encontrado.')


def _compra(usuario, pk):
    compra = ComprasDigitales.objects.select_related('producto').filter(pk=pk, usuario=usuario, activo=True).first()
    if compra is None:
        raise Http404('No tienes una compra activa con ese identificador.')
    return compra.producto.archivo_3d


def _producto_admin(usuario, pk):
    # Cualquier producto, activo o no: el admin gestiona también los inactivos.
    _solo_staff(usuario)
    return get_object_or_404(Producto, pk=pk).archivo_3d


def _comision_del_cliente(modelo):
    def resolver(usuario, pk):
        comision = modelo.objects.filter(pk=pk, usuario=usuario).first()
        if comision is None:
            raise Http404('No tienes una comisión con ese identificador.')
        return comision.archivo_entrega
    return resolver


def _comision_del_admin(modelo):
    def resolver(usuario, pk):
        _solo_staff(usuario)
        return get_object_or_404(modelo, pk=pk).archivo_entrega
    return resolver


RESOLUTORES = {
    'compra': _compra,                                  # orders.DescargarCompraView
    'producto': _producto_admin,                        # products.ProductoViewSet.descargar (staff)
    'motion': _comision_del_cliente(ComisionMotion),    # custom_orders.DescargarComisionMotionView
    'modelo': _comision_del_cliente(ComisionModelo),    # custom_orders.DescargarComisionModeloView
    'motion-admin': _comision_del_admin(ComisionMotion),  # ComisionMotionAdminViewSet.descargar
    'modelo-admin': _comision_del_admin(ComisionModelo),  # ComisionModeloAdminViewSet.descargar
}


def archivo_de(tipo, usuario, pk):
    """El archivo que `usuario` tiene derecho a bajar, o Http404."""
    resolver = RESOLUTORES.get(tipo)
    if resolver is None:
        raise Http404('No encontrado.')
    archivo = resolver(usuario, pk)
    if not archivo or not archivo.storage.exists(archivo.name):
        raise Http404('Este elemento no tiene un archivo para descargar.')
    return archivo


# --- Paso 1: el enlace ------------------------------------------------------

def enlace_de_descarga(request, tipo, pk):
    """Comprueba el derecho y devuelve el cuerpo de la respuesta de las vistas
    .../descargar/: {url, nombre, caduca_en}."""
    pk = int(pk)
    archivo = archivo_de(tipo, request.user, pk)
    nombre = os.path.basename(archivo.name)
    token = signing.dumps({'t': tipo, 'id': pk, 'u': request.user.pk}, salt=SAL_FIRMA)
    # El nombre va al final de la dirección solo para que el navegador tenga
    # algo razonable si no leyera Content-Disposition; no se usa al servir.
    ruta = reverse('descarga-firmada', kwargs={'token': token, 'nombre': nombre})
    return {
        'url': request.build_absolute_uri(ruta),
        'nombre': nombre,
        'caduca_en': settings.DESCARGA_ENLACE_SEGUNDOS,
    }


# --- Paso 2: servir ---------------------------------------------------------

def respuesta_con_archivo(archivo):
    nombre = os.path.basename(archivo.name)

    if settings.DESCARGA_DIRECTA_URL:
        # LiteSpeed envía el archivo. Conserva Content-Type y Content-Disposition
        # de esta respuesta y añade Content-Length/Accept-Ranges él mismo. La
        # carpeta de destino está cerrada al acceso directo por su .htaccess,
        # que exige `clave` en la consulta; el navegador nunca ve esta
        # dirección interna.
        respuesta = HttpResponse(content_type='application/octet-stream')
        destino = settings.DESCARGA_DIRECTA_URL + quote(archivo.name)
        if settings.DESCARGA_DIRECTA_CLAVE:
            destino += '?clave=' + quote(settings.DESCARGA_DIRECTA_CLAVE, safe='')
        respuesta['X-LiteSpeed-Location'] = destino
    else:
        respuesta = FileResponse(archivo.open('rb'), content_type='application/octet-stream')

    respuesta['Content-Disposition'] = content_disposition_header(True, nombre)
    return respuesta


class DescargaFirmadaView(View):
    """GET api/v1/descargas/<token>/<nombre>: la dirección que abre el navegador.
    Sin sesión: el derecho viene del token (firmado por `enlace_de_descarga`) y
    se vuelve a comprobar aquí. Cualquier fallo es 404, sin distinguir motivo."""

    def get(self, request, token, nombre):
        try:
            datos = signing.loads(token, salt=SAL_FIRMA, max_age=settings.DESCARGA_ENLACE_SEGUNDOS)
        except signing.BadSignature:  # incluye SignatureExpired
            raise Http404('El enlace de descarga no es válido o ya caducó.')

        usuario = get_user_model().objects.filter(pk=datos['u'], is_active=True).first()
        if usuario is None:
            raise Http404('El enlace de descarga no es válido o ya caducó.')

        return respuesta_con_archivo(archivo_de(datos['t'], usuario, datos['id']))
