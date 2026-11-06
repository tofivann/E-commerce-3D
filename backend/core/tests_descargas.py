"""La descarga en dos pasos de core/descargas.py: el enlace firmado que piden
las vistas .../descargar/ con sesión, y la dirección que abre el navegador sin
sesión. Qué pasa con cada derecho, con el enlace caducado o manipulado, y
quién envía el archivo (Django o LiteSpeed).
"""
import time
from unittest import mock
from urllib.parse import urlparse

from django.core.files.base import ContentFile
from django.test import override_settings
from rest_framework.test import APIClient

from core.tests_media import MediaTestsBase, cuerpo
from orders.models import ComprasDigitales

URL_FIRMADA = '/api/v1/descargas/'


class DescargasBase(MediaTestsBase):
    def enlace(self, url, usuario):
        """Pide el enlace con la sesión de `usuario`; devuelve la respuesta."""
        self.client.force_authenticate(usuario)
        return self.client.get(url)

    def abrir(self, url_firmada, **cabeceras):
        """Abre la dirección firmada como lo haría el navegador: sin sesión."""
        return APIClient().get(url_firmada, **cabeceras)


class EnlaceTests(DescargasBase):
    def test_el_enlace_lleva_la_direccion_firmada_el_nombre_y_la_validez(self):
        producto = self.crear_producto()
        compra = self.comprar(self.comprador, producto)

        respuesta = self.enlace(f'/api/v1/orders/biblioteca/{compra.id}/descargar/', self.comprador)

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertEqual(respuesta.data['nombre'], producto.archivo_3d.name.split('/')[-1])
        self.assertEqual(respuesta.data['caduca_en'], 60 * 60)
        ruta = urlparse(respuesta.data['url']).path
        self.assertTrue(ruta.startswith(URL_FIRMADA), ruta)
        self.assertTrue(ruta.endswith('/' + respuesta.data['nombre']), ruta)

    def test_el_navegador_baja_el_archivo_sin_sesion_y_con_su_nombre(self):
        producto = self.crear_producto()
        compra = self.comprar(self.comprador, producto)
        enlace = self.enlace(f'/api/v1/orders/biblioteca/{compra.id}/descargar/', self.comprador)

        respuesta = self.abrir(enlace.data['url'])

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(cuerpo(respuesta), b'CONTENIDO-DE-PAGO')
        self.assertEqual(respuesta['Content-Type'], 'application/octet-stream')
        self.assertIn('attachment', respuesta['Content-Disposition'])
        self.assertIn(enlace.data['nombre'], respuesta['Content-Disposition'])

    def test_el_nombre_al_final_de_la_direccion_es_solo_decorativo(self):
        producto = self.crear_producto()
        compra = self.comprar(self.comprador, producto)
        enlace = self.enlace(f'/api/v1/orders/biblioteca/{compra.id}/descargar/', self.comprador)
        ruta = urlparse(enlace.data['url']).path
        otra_ruta = ruta.rsplit('/', 1)[0] + '/otro-nombre.zip'

        respuesta = self.abrir(otra_ruta)

        self.assertEqual(respuesta.status_code, 200)
        # Se sirve el archivo real con su nombre real: la dirección no manda.
        self.assertIn(enlace.data['nombre'], respuesta['Content-Disposition'])

    def test_un_elemento_sin_archivo_o_con_el_archivo_perdido_no_da_enlace(self):
        producto = self.crear_producto()
        compra = self.comprar(self.comprador, producto)
        url = f'/api/v1/orders/biblioteca/{compra.id}/descargar/'
        enlace = self.enlace(url, self.comprador)
        self.assertEqual(enlace.status_code, 200)

        producto.archivo_3d.storage.delete(producto.archivo_3d.name)

        self.assertEqual(self.enlace(url, self.comprador).status_code, 404)
        # Y un enlace que ya se había dado tampoco sirve.
        self.assertEqual(self.abrir(enlace.data['url']).status_code, 404)


class DerechosTests(DescargasBase):
    """El derecho se comprueba dos veces: al pedir el enlace y al abrirlo."""

    def test_el_enlace_caduca(self):
        producto = self.crear_producto()
        compra = self.comprar(self.comprador, producto)
        enlace = self.enlace(f'/api/v1/orders/biblioteca/{compra.id}/descargar/', self.comprador)
        ahora = time.time()

        with mock.patch('django.core.signing.time.time', return_value=ahora + 60 * 60 - 5):
            self.assertEqual(self.abrir(enlace.data['url']).status_code, 200)
        with mock.patch('django.core.signing.time.time', return_value=ahora + 60 * 60 + 5):
            self.assertEqual(self.abrir(enlace.data['url']).status_code, 404)

    def test_un_enlace_manipulado_no_sirve(self):
        producto = self.crear_producto()
        compra = self.comprar(self.comprador, producto)
        enlace = self.enlace(f'/api/v1/orders/biblioteca/{compra.id}/descargar/', self.comprador)
        ruta = urlparse(enlace.data['url']).path
        token, nombre = ruta[len(URL_FIRMADA):].split('/', 1)

        # Un carácter cambiado en el token, en la firma o en la carga útil.
        for roto in (token[:-1] + ('A' if token[-1] != 'A' else 'B'), 'x' + token[1:], token[:10] + token[11:]):
            self.assertEqual(self.abrir(f'{URL_FIRMADA}{roto}/{nombre}').status_code, 404, roto)
        self.assertEqual(self.abrir(f'{URL_FIRMADA}cualquier-cosa/{nombre}').status_code, 404)

    def test_el_enlace_deja_de_servir_si_se_pierde_el_derecho(self):
        producto = self.crear_producto()
        compra = self.comprar(self.comprador, producto)
        enlace = self.enlace(f'/api/v1/orders/biblioteca/{compra.id}/descargar/', self.comprador)
        self.assertEqual(self.abrir(enlace.data['url']).status_code, 200)

        ComprasDigitales.objects.filter(pk=compra.pk).update(activo=False)

        self.assertEqual(self.abrir(enlace.data['url']).status_code, 404)

    def test_el_enlace_deja_de_servir_si_la_cuenta_se_desactiva(self):
        producto = self.crear_producto()
        compra = self.comprar(self.comprador, producto)
        enlace = self.enlace(f'/api/v1/orders/biblioteca/{compra.id}/descargar/', self.comprador)

        self.comprador.is_active = False
        self.comprador.save()

        self.assertEqual(self.abrir(enlace.data['url']).status_code, 404)

    def test_el_enlace_del_admin_deja_de_servir_si_deja_de_ser_staff(self):
        producto = self.crear_producto()
        enlace = self.enlace(f'/api/v1/products/products/{producto.id}/descargar/', self.admin)
        self.assertEqual(self.abrir(enlace.data['url']).status_code, 200)

        self.admin.is_staff = False
        self.admin.save()

        self.assertEqual(self.abrir(enlace.data['url']).status_code, 404)

    def test_el_admin_baja_la_entrega_de_una_comision_modelo_y_el_cliente_tambien(self):
        from custom_orders.models import ComisionModelo, EstadoComision, JuegoComision
        from orders.models import Orden
        from decimal import Decimal

        juego = JuegoComision.objects.create(nombre='Bang Dream', precio=Decimal('60.00'))
        orden = Orden.objects.create(
            codigo_orden='MOD-TEST', usuario=self.comprador, total=Decimal('60.00'),
            estado_pago=Orden.EstadoPago.COMPLETADO, tipo_orden=Orden.TipoOrden.COMISION_MODELO, pasarela_pago='Stripe',
        )
        comision = ComisionModelo(
            orden=orden, usuario=self.comprador, juego=juego, nombre_personaje='Kasumi', estado=EstadoComision.COMPLETADO,
        )
        comision.archivo_entrega.save('kasumi.zip', ContentFile(b'ENTREGA-MODELO'), save=False)
        comision.save()
        del_cliente = f'/api/v1/custom-orders/comisiones/modelo/{comision.id}/descargar/'
        del_admin = f'/api/v1/custom-orders/admin/comisiones/modelo/{comision.id}/descargar/'

        self.assertEqual(cuerpo(self.abrir(self.enlace(del_cliente, self.comprador).data['url'])), b'ENTREGA-MODELO')
        self.assertEqual(cuerpo(self.abrir(self.enlace(del_admin, self.admin).data['url'])), b'ENTREGA-MODELO')
        self.assertEqual(self.enlace(del_cliente, self.otro).status_code, 404)
        self.assertEqual(self.enlace(del_admin, self.otro).status_code, 403)


@override_settings(DESCARGA_DIRECTA_URL='/_media-prueba/', DESCARGA_DIRECTA_CLAVE='clave secreta&')
class DescargaDirectaPorLiteSpeedTests(DescargasBase):
    """Con DESCARGA_DIRECTA_URL, Django no envía bytes: responde las
    cabeceras y X-LiteSpeed-Location, y LiteSpeed sirve el archivo."""

    def test_responde_la_direccion_interna_con_la_clave_y_sin_cuerpo(self):
        producto = self.crear_producto()
        compra = self.comprar(self.comprador, producto)
        enlace = self.enlace(f'/api/v1/orders/biblioteca/{compra.id}/descargar/', self.comprador)

        respuesta = self.abrir(enlace.data['url'])

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.content, b'')
        self.assertEqual(
            respuesta['X-LiteSpeed-Location'],
            f'/_media-prueba/{producto.archivo_3d.name}?clave=clave%20secreta%26',
        )
        self.assertEqual(respuesta['Content-Type'], 'application/octet-stream')
        self.assertIn('attachment', respuesta['Content-Disposition'])

    def test_los_nombres_con_acentos_van_codificados(self):
        producto = self.crear_producto()
        # (Los espacios no llegan aquí: el storage de Django los cambia por "_" al guardar.)
        producto.archivo_3d.save('Canción bonita.rar', ContentFile(b'x'), save=True)
        self.assertEqual(producto.archivo_3d.name, 'modelos_3d/Canción_bonita.rar')
        compra = self.comprar(self.comprador, producto)
        enlace = self.enlace(f'/api/v1/orders/biblioteca/{compra.id}/descargar/', self.comprador)

        respuesta = self.abrir(enlace.data['url'])

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(
            respuesta['X-LiteSpeed-Location'],
            '/_media-prueba/modelos_3d/Canci%C3%B3n_bonita.rar?clave=clave%20secreta%26',
        )
        self.assertIn("filename*=utf-8''Canci%C3%B3n_bonita.rar", respuesta['Content-Disposition'])

    def test_el_derecho_se_sigue_comprobando(self):
        producto = self.crear_producto()
        compra = self.comprar(self.comprador, producto)
        enlace = self.enlace(f'/api/v1/orders/biblioteca/{compra.id}/descargar/', self.comprador)
        ComprasDigitales.objects.filter(pk=compra.pk).update(activo=False)

        respuesta = self.abrir(enlace.data['url'])

        self.assertEqual(respuesta.status_code, 404)
        self.assertFalse(respuesta.has_header('X-LiteSpeed-Location'))
