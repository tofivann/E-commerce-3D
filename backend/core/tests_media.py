"""Los archivos que se venden o se entregan no se pueden pedir por su
dirección: solo salen por las vistas de descarga, que comprueban sesión y
derecho. Las imágenes sí se sirven por dirección (las pinta un <img>).
"""
import json
import shutil
import tempfile
from decimal import Decimal

from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.db import models
from django.test import override_settings
from rest_framework.test import APITestCase

from core.media import CARPETAS_PUBLICAS, es_publico
from custom_orders.models import ComisionMotion, EstadoComision, TramoPersonajesMotion
from orders.models import ComprasDigitales, Orden
from products.models import Categoria, Producto

APPS_DEL_PROYECTO = {'users', 'products', 'shopping_cart', 'orders', 'custom_orders', 'chat'}
GIF = (
    b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00'
    b'\xff\xff\xff\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00'
    b'\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
)


def cuerpo(respuesta):
    return b''.join(respuesta.streaming_content)


class MediaTestsBase(APITestCase):
    """Cada test usa su propio MEDIA_ROOT temporal: se crean archivos reales."""

    def setUp(self):
        self.media = tempfile.mkdtemp(prefix='media-test-')
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        ajustes = override_settings(MEDIA_ROOT=self.media)
        ajustes.enable()
        self.addCleanup(ajustes.disable)

        Usuario = get_user_model()
        self.comprador = Usuario.objects.create_user(
            username='comprador', email='comprador@test.com', password='x', estado_suscripcion='ACTIVO',
        )
        self.otro = Usuario.objects.create_user(
            username='otro', email='otro@test.com', password='x', estado_suscripcion='ACTIVO',
        )
        self.admin = Usuario.objects.create_user(username='admin', email='admin@test.com', password='x', is_staff=True)

    def crear_producto(self, titulo='Aoi'):
        producto = Producto(titulo=titulo, descripcion='', precio=Decimal('10.00'), formato_archivo='zip')
        producto.archivo_3d.save('aoi.zip', ContentFile(b'CONTENIDO-DE-PAGO'), save=False)
        producto.imagen_previa.save('aoi.gif', ContentFile(GIF), save=False)
        producto.save()
        producto.categorias.set([Categoria.objects.get(nombre='Modelo')])
        return producto

    def crear_comision(self, usuario):
        tramo = TramoPersonajesMotion.objects.create(
            nombre='Characters', min_personajes=1, max_personajes=3, precio=Decimal('40.00'),
        )
        orden = Orden.objects.create(
            codigo_orden='MOT-TEST', usuario=usuario, total=Decimal('40.00'),
            estado_pago=Orden.EstadoPago.COMPLETADO, tipo_orden=Orden.TipoOrden.COMISION_MOTION, pasarela_pago='Stripe',
        )
        comision = ComisionMotion(
            orden=orden, usuario=usuario, tramo_personajes=tramo, nombre_juego='Juego', nombre_cancion='Canción',
            link_video='https://youtube.com/watch?v=x', estado=EstadoComision.COMPLETADO,
        )
        comision.archivo_entrega.save('entrega.zip', ContentFile(b'ENTREGA-PRIVADA'), save=False)
        comision.foto_entrega.save('resultado.gif', ContentFile(GIF), save=False)
        comision.save()
        return comision

    def comprar(self, usuario, producto):
        orden = Orden.objects.create(
            codigo_orden=f'ORD-{usuario.id}', usuario=usuario, total=producto.precio,
            estado_pago=Orden.EstadoPago.COMPLETADO, tipo_orden=Orden.TipoOrden.CATALOGO, pasarela_pago='Stripe',
        )
        return ComprasDigitales.objects.create(usuario=usuario, producto=producto, orden=orden)


class CarpetasPublicasTests(MediaTestsBase):
    def test_cada_carpeta_de_imagenes_es_publica_y_ninguna_de_archivos_lo_es(self):
        # Recorre los modelos reales: un FileField nuevo queda cerrado por
        # defecto, y un ImageField nuevo obliga a decidir (este test falla
        # hasta que se añada su carpeta a CARPETAS_PUBLICAS o a la excepción).
        for modelo in apps.get_models():
            if modelo._meta.app_label not in APPS_DEL_PROYECTO:
                continue
            for campo in modelo._meta.get_fields():
                if not isinstance(campo, models.FileField):
                    continue
                ejemplo = f'{campo.upload_to}archivo.bin'
                if isinstance(campo, models.ImageField):
                    self.assertTrue(es_publico(ejemplo), f'{modelo.__name__}.{campo.name}: imagen sin carpeta pública')
                else:
                    self.assertFalse(es_publico(ejemplo), f'{modelo.__name__}.{campo.name}: archivo de pago en carpeta pública')

    def test_no_se_puede_salir_de_una_carpeta_publica_con_puntos(self):
        for ruta in (
            'productos_preview/../modelos_3d/aoi.zip',
            'productos_preview/../../db.sqlite3',
            '/productos_preview/../comisiones/motion/entrega.zip',
            'comisiones/motion/entrega/../entrega.zip',
            'productos_preview\\..\\modelos_3d\\aoi.zip',
        ):
            self.assertFalse(es_publico(ruta), ruta)
        self.assertTrue(es_publico('productos_preview/aoi.gif'))
        self.assertEqual(len(CARPETAS_PUBLICAS), len(set(CARPETAS_PUBLICAS)))


class DireccionDirectaTests(MediaTestsBase):
    def test_el_archivo_de_un_producto_no_se_sirve_por_direccion_ni_al_admin(self):
        producto = self.crear_producto()
        direccion = f'/media/{producto.archivo_3d.name}'

        self.assertEqual(self.client.get(direccion).status_code, 404)
        for usuario in (self.comprador, self.admin):
            self.client.force_authenticate(usuario)
            self.assertEqual(self.client.get(direccion).status_code, 404)

    def test_la_entrega_de_una_comision_no_se_sirve_por_direccion(self):
        comision = self.crear_comision(self.comprador)
        self.assertEqual(self.client.get(f'/media/{comision.archivo_entrega.name}').status_code, 404)

    def test_las_imagenes_si_se_sirven_sin_sesion(self):
        producto = self.crear_producto()
        comision = self.crear_comision(self.comprador)
        for imagen in (producto.imagen_previa.name, comision.foto_entrega.name):
            respuesta = self.client.get(f'/media/{imagen}')
            self.assertEqual(respuesta.status_code, 200, imagen)
            self.assertEqual(cuerpo(respuesta), GIF)

    def test_un_archivo_que_no_existe_y_uno_protegido_responden_igual(self):
        # No se revela ni siquiera si el archivo existe.
        producto = self.crear_producto()
        existe = self.client.get(f'/media/{producto.archivo_3d.name}')
        no_existe = self.client.get('/media/modelos_3d/no-existe.zip')
        self.assertEqual((existe.status_code, no_existe.status_code), (404, 404))

    def test_no_se_alcanza_un_archivo_de_pago_atravesando_una_carpeta_publica(self):
        producto = self.crear_producto()
        nombre = producto.archivo_3d.name.split('/')[-1]
        for direccion in (
            f'/media/productos_preview/../modelos_3d/{nombre}',
            f'/media/productos_preview/%2e%2e/modelos_3d/{nombre}',
            f'/media//modelos_3d/{nombre}',
        ):
            self.assertEqual(self.client.get(direccion).status_code, 404, direccion)


class RespuestasSinDireccionesTests(MediaTestsBase):
    """Ninguna respuesta de la API lleva la dirección de un archivo de pago."""

    def assertSinArchivo(self, respuesta, archivo):
        self.assertEqual(respuesta.status_code, 200, getattr(respuesta, 'data', None))
        texto = json.dumps(respuesta.json())
        self.assertNotIn(archivo.name, texto)
        self.assertNotIn(archivo.name.split('/')[-1], texto)
        self.assertNotIn('archivo_3d', texto)

    def test_catalogo_detalle_carrito_y_biblioteca(self):
        producto = self.crear_producto()
        archivo = producto.archivo_3d

        self.assertSinArchivo(self.client.get('/api/v1/products/products/'), archivo)
        self.assertSinArchivo(self.client.get(f'/api/v1/products/products/{producto.id}/'), archivo)

        self.client.force_authenticate(self.comprador)
        self.client.post('/api/v1/cart/items/', {'producto': producto.id}, format='json')
        self.assertSinArchivo(self.client.get('/api/v1/cart/mio/'), archivo)
        self.client.put(f'/api/v1/products/favoritos/{producto.id}/')
        self.assertSinArchivo(self.client.get('/api/v1/products/favoritos/'), archivo)
        self.comprar(self.comprador, producto)
        self.assertSinArchivo(self.client.get('/api/v1/orders/biblioteca/'), archivo)

    def test_las_imagenes_siguen_llegando_con_su_direccion(self):
        producto = self.crear_producto()
        dato = self.client.get(f'/api/v1/products/products/{producto.id}/').json()
        self.assertTrue(dato['imagen_previa'].endswith(producto.imagen_previa.name))

    def test_el_nombre_del_archivo_solo_lo_ve_el_admin(self):
        producto = self.crear_producto()
        url = f'/api/v1/products/products/{producto.id}/'

        self.assertIsNone(self.client.get(url).json()['archivo_nombre'])
        self.client.force_authenticate(self.comprador)
        self.assertIsNone(self.client.get(url).json()['archivo_nombre'])
        self.client.force_authenticate(self.admin)
        dato = self.client.get(url).json()
        self.assertEqual(dato['archivo_nombre'], producto.archivo_3d.name.split('/')[-1])
        self.assertNotIn('archivo_3d', dato)

    def test_comisiones_del_admin_llevan_el_nombre_no_la_direccion(self):
        comision = self.crear_comision(self.comprador)
        self.client.force_authenticate(self.admin)

        dato = self.client.get(f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/').json()

        self.assertNotIn('archivo_entrega', dato)
        self.assertEqual(dato['archivo_entrega_nombre'], comision.archivo_entrega.name.split('/')[-1])
        self.assertNotIn('/media/comisiones/motion/entrega.zip', json.dumps(dato))
        # La foto del resultado sí viaja: es una imagen.
        self.assertIn('comisiones/motion/entrega/', dato['foto_entrega'])


class DescargasConPermisoTests(MediaTestsBase):
    def test_quien_compro_descarga_y_quien_no_no(self):
        producto = self.crear_producto()
        compra = self.comprar(self.comprador, producto)
        url = f'/api/v1/orders/biblioteca/{compra.id}/descargar/'

        self.assertEqual(self.client.get(url).status_code, 401)
        self.client.force_authenticate(self.otro)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.client.force_authenticate(self.comprador)
        respuesta = self.client.get(url)
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(cuerpo(respuesta), b'CONTENIDO-DE-PAGO')

    def test_el_admin_descarga_el_archivo_de_un_producto_y_nadie_mas(self):
        producto = self.crear_producto()
        url = f'/api/v1/products/products/{producto.id}/descargar/'

        self.assertEqual(self.client.get(url).status_code, 401)
        self.client.force_authenticate(self.comprador)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_authenticate(self.admin)
        respuesta = self.client.get(url)
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(cuerpo(respuesta), b'CONTENIDO-DE-PAGO')
        self.assertIn('attachment', respuesta['Content-Disposition'])

    def test_la_entrega_la_baja_su_cliente_y_el_admin_pero_no_otro_cliente(self):
        comision = self.crear_comision(self.comprador)
        del_cliente = f'/api/v1/custom-orders/comisiones/motion/{comision.id}/descargar/'
        del_admin = f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/descargar/'

        self.client.force_authenticate(self.otro)
        self.assertEqual(self.client.get(del_cliente).status_code, 404)
        self.assertEqual(self.client.get(del_admin).status_code, 403)

        self.client.force_authenticate(self.comprador)
        self.assertEqual(cuerpo(self.client.get(del_cliente)), b'ENTREGA-PRIVADA')
        self.assertEqual(self.client.get(del_admin).status_code, 403)

        self.client.force_authenticate(self.admin)
        self.assertEqual(cuerpo(self.client.get(del_admin)), b'ENTREGA-PRIVADA')

    def test_un_producto_publicado_desde_una_comision_lo_descarga_quien_lo_compra(self):
        comision = self.crear_comision(self.comprador)
        ComisionMotion.objects.filter(pk=comision.pk).update(
            titulo_publicacion='Canción', descripcion_publicacion='d', precio_publicacion=Decimal('15.00'),
            formato_archivo_publicacion='zip',
        )
        comision.categorias.set([Categoria.objects.get(nombre='Motion')])
        self.client.force_authenticate(self.admin)
        publicado = self.client.post(f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/publicar/')
        self.assertEqual(publicado.status_code, 200, publicado.data)
        producto = Producto.objects.get(comision_motion_origen=comision)

        # El producto reutiliza el archivo de la entrega, que vive en una
        # carpeta cerrada: por dirección no sale...
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f'/media/{producto.archivo_3d.name}').status_code, 404)
        # ...pero su portada (la foto del resultado) sí.
        self.assertEqual(self.client.get(f'/media/{producto.imagen_previa.name}').status_code, 200)

        # Y quien lo compra en la tienda lo descarga por su biblioteca.
        compra = self.comprar(self.otro, producto)
        self.client.force_authenticate(self.otro)
        self.assertEqual(cuerpo(self.client.get(f'/api/v1/orders/biblioteca/{compra.id}/descargar/')), b'ENTREGA-PRIVADA')
