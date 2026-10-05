"""Correos en el idioma del destinatario (ES/EN): cómo se sabe el idioma de
una petición, cómo se recuerda en la cuenta y qué versión de cada correo sale.

En todos los tests se intercepta la llamada HTTP a Resend
(`core.email_utils.requests.post`), nunca `enviar_email`: así se comprueba el
asunto y el HTML que de verdad se enviarían.
"""
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.template.loader import get_template
from django.test import RequestFactory, SimpleTestCase
from rest_framework.test import APITestCase

from core.email_utils import enviar_email, plantillas_para
from core.idiomas import EN, ES, idioma_de_peticion, normalizar_idioma
from custom_orders.models import ComisionMotion, EstadoComision, TramoPersonajesMotion
from custom_orders.services import marcar_comision_pagada
from orders.models import DetalleOrden, Orden
from products.models import Categoria, Producto
from shopping_cart.services import marcar_orden_pagada
from users.services import activar_suscripcion_usuario
from users.tokens import respuesta_login

PLANTILLAS = [
    'users/email_cuenta_activada.html',
    'users/email_reset_password.html',
    'shopping_cart/email_recibo_compra.html',
    'custom_orders/email_comision_pagada.html',
    'custom_orders/email_comision_completada.html',
]


def crear_usuario(email, **extra):
    return get_user_model().objects.create_user(
        username=email, email=email, password='clave-segura-123', nombre='Ana', **extra,
    )


def correo_enviado(post_simulado):
    """(asunto, html) de la única llamada a Resend."""
    assert post_simulado.call_count == 1, f'se esperaba 1 correo, hubo {post_simulado.call_count}'
    cuerpo = post_simulado.call_args.kwargs['json']
    return cuerpo['subject'], cuerpo['html']


class IdiomaDePeticionTests(SimpleTestCase):
    def idioma(self, cabecera=None):
        extra = {} if cabecera is None else {'HTTP_ACCEPT_LANGUAGE': cabecera}
        return idioma_de_peticion(RequestFactory().get('/', **extra))

    def test_lo_que_manda_el_frontend(self):
        self.assertEqual(self.idioma('es'), ES)
        self.assertEqual(self.idioma('en'), EN)

    def test_variantes_regionales_y_listas_de_navegador(self):
        self.assertEqual(self.idioma('en-US,en;q=0.9,es;q=0.8'), EN)
        self.assertEqual(self.idioma('es-VE,es;q=0.9'), ES)
        # Primer idioma soportado según la preferencia, no el primero a secas.
        self.assertEqual(self.idioma('fr-FR,fr;q=0.9,en;q=0.5'), EN)

    def test_sin_cabecera_o_sin_idioma_soportado_no_se_inventa_ninguno(self):
        self.assertIsNone(self.idioma())
        self.assertIsNone(self.idioma(''))
        self.assertIsNone(self.idioma('fr,de;q=0.8'))

    def test_normalizar(self):
        self.assertEqual(normalizar_idioma('EN_us'), EN)
        self.assertIsNone(normalizar_idioma('pt'))
        self.assertIsNone(normalizar_idioma(None))


class PlantillasDeCorreoTests(SimpleTestCase):
    def test_el_espanol_es_la_plantilla_de_siempre_y_el_ingles_va_al_lado(self):
        self.assertEqual(plantillas_para('users/email_x.html', ES), ['users/email_x.html'])
        self.assertEqual(plantillas_para('users/email_x.html', EN), ['users/email_x.en.html', 'users/email_x.html'])

    def test_todos_los_correos_tienen_su_version_en_ingles(self):
        # Sin esto, plantillas_para caería en silencio a la versión en español.
        for nombre in PLANTILLAS:
            get_template(nombre)
            get_template(nombre.replace('.html', '.en.html'))

    @patch('core.email_utils.requests.post')
    def test_enviar_email_elige_asunto_y_plantilla_por_idioma(self, post):
        asuntos = {ES: 'Restablece tu contraseña', EN: 'Reset your password'}
        contexto = {'nombre': 'Ana', 'enlace': 'https://x.test/r'}

        enviar_email('a@test.com', asuntos, 'users/email_reset_password.html', contexto, idioma=EN)
        asunto, html = correo_enviado(post)
        self.assertEqual(asunto, 'Reset your password')
        self.assertIn('We received a request', html)
        self.assertIn('<html lang="en">', html)
        self.assertIn('https://x.test/r', html)

        post.reset_mock()
        enviar_email('a@test.com', asuntos, 'users/email_reset_password.html', contexto, idioma=ES)
        asunto, html = correo_enviado(post)
        self.assertEqual(asunto, 'Restablece tu contraseña')
        self.assertIn('Recibimos una solicitud', html)
        self.assertIn('<html lang="es">', html)

    @patch('core.email_utils.requests.post')
    def test_idioma_desconocido_o_ausente_sale_en_espanol(self, post):
        asuntos = {ES: 'Hola', EN: 'Hi'}
        for idioma in ('pt', '', None):
            post.reset_mock()
            enviar_email('a@test.com', asuntos, 'users/email_reset_password.html', {'enlace': '#'}, idioma=idioma)
            self.assertEqual(correo_enviado(post)[0], 'Hola', idioma)


class RecordarIdiomaTests(APITestCase):
    """El idioma de la cuenta se mantiene solo con las peticiones autenticadas."""

    def setUp(self):
        self.usuario = crear_usuario('ana@test.com', estado_suscripcion='ACTIVO')
        acceso = respuesta_login(self.usuario, remember_me=False)['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {acceso}')

    def pedir(self, idioma=None):
        extra = {} if idioma is None else {'HTTP_ACCEPT_LANGUAGE': idioma}
        respuesta = self.client.get('/api/v1/cart/mio/', **extra)
        self.assertEqual(respuesta.status_code, 200)
        self.usuario.refresh_from_db()
        return self.usuario.idioma

    def test_nace_en_espanol(self):
        self.assertEqual(self.usuario.idioma, ES)

    def test_una_peticion_en_ingles_lo_cambia_y_otra_en_espanol_lo_devuelve(self):
        self.assertEqual(self.pedir('en'), EN)
        self.assertEqual(self.pedir('es'), ES)

    def test_sin_cabecera_o_con_un_idioma_no_soportado_no_cambia(self):
        self.pedir('en')
        self.assertEqual(self.pedir(), EN)
        self.assertEqual(self.pedir('fr'), EN)

    def test_solo_escribe_cuando_cambia(self):
        self.pedir('en')
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        with CaptureQueriesContext(connection) as consultas:
            self.client.get('/api/v1/cart/mio/', HTTP_ACCEPT_LANGUAGE='en')
        self.assertFalse([c for c in consultas if c['sql'].startswith('UPDATE')])

    def test_una_peticion_sin_sesion_no_toca_ninguna_cuenta(self):
        self.client.credentials()
        self.client.get('/api/v1/products/products/', HTTP_ACCEPT_LANGUAGE='en')
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.idioma, ES)


class RegistroYResetTests(APITestCase):
    DATOS = {'username': 'nuevo', 'email': 'nuevo@test.com', 'nombre': 'Nuevo', 'password': 'clave-segura-123'}

    def registrar(self, idioma=None):
        extra = {} if idioma is None else {'HTTP_ACCEPT_LANGUAGE': idioma}
        with patch('users.views.stripe.checkout.Session.create') as crear_sesion:
            crear_sesion.return_value.id = 'sess_registro'
            crear_sesion.return_value.url = 'https://stripe.test/pagar'
            respuesta = self.client.post('/api/v1/users/auth/register/', self.DATOS, format='json', **extra)
        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        return get_user_model().objects.get(email='nuevo@test.com')

    def test_el_registro_guarda_el_idioma_en_que_se_registro(self):
        self.assertEqual(self.registrar('en').idioma, EN)

    def test_el_registro_sin_idioma_queda_en_espanol(self):
        self.assertEqual(self.registrar().idioma, ES)

    @patch('core.email_utils.requests.post')
    def test_cuenta_activada_sale_en_el_idioma_del_registro(self, post):
        usuario = self.registrar('en')
        # Lo dispara el webhook de la pasarela: aquí no hay idioma de petición.
        activar_suscripcion_usuario({'metadata': {'user_id': str(usuario.id)}})

        asunto, html = correo_enviado(post)
        self.assertEqual(asunto, 'Your account is now active! 🎉')
        self.assertIn('Your payment was confirmed', html)

    @patch('core.email_utils.requests.post')
    def test_reset_usa_el_idioma_de_la_peticion_no_el_guardado(self, post):
        crear_usuario('ana@test.com', idioma=ES)

        self.client.post('/api/v1/users/auth/solicitar-password/', {'email': 'ana@test.com'}, format='json', HTTP_ACCEPT_LANGUAGE='en')

        asunto, html = correo_enviado(post)
        self.assertEqual(asunto, 'Reset your password')
        self.assertIn('Reset password', html)

    @patch('core.email_utils.requests.post')
    def test_reset_sin_idioma_en_la_peticion_usa_el_guardado(self, post):
        crear_usuario('ana@test.com', idioma=EN)

        self.client.post('/api/v1/users/auth/solicitar-password/', {'email': 'ana@test.com'}, format='json')

        self.assertEqual(correo_enviado(post)[0], 'Reset your password')


class CorreosDePagoYEntregaTests(APITestCase):
    """Correos que salen sin el cliente presente: usan el idioma de SU cuenta."""

    def setUp(self):
        self.cliente_en = crear_usuario('english@test.com', idioma=EN, estado_suscripcion='ACTIVO')
        self.cliente_es = crear_usuario('espanol@test.com', idioma=ES, estado_suscripcion='ACTIVO')
        self.tramo = TramoPersonajesMotion.objects.create(
            nombre='Characters', min_personajes=1, max_personajes=3, precio=Decimal('40.00'),
        )

    def orden(self, usuario, tipo, sesion):
        return Orden.objects.create(
            codigo_orden=f'TEST-{sesion}', usuario=usuario, total=Decimal('40.00'),
            estado_pago=Orden.EstadoPago.PENDIENTE, tipo_orden=tipo, pasarela_pago='Stripe', stripe_session_id=sesion,
        )

    def comision(self, usuario, sesion, estado=EstadoComision.SOLICITADO):
        orden = self.orden(usuario, Orden.TipoOrden.COMISION_MOTION, sesion)
        return ComisionMotion.objects.create(
            orden=orden, usuario=usuario, tramo_personajes=self.tramo, nombre_juego='Juego',
            nombre_cancion='Canción', link_video='https://youtube.com/watch?v=x', estado=estado,
        )

    @patch('core.email_utils.requests.post')
    def test_recibo_de_compra(self, post):
        for usuario, sesion, asunto_esperado, frase, etiqueta in (
            (self.cliente_en, 'sess_en', 'Your purchase receipt ✨', 'Thank you for your purchase', 'Order: TEST-sess_en'),
            (self.cliente_es, 'sess_es', 'Recibo de tu compra ✨', '¡Gracias por tu compra!', 'Orden: TEST-sess_es'),
        ):
            post.reset_mock()
            orden = self.orden(usuario, Orden.TipoOrden.CATALOGO, sesion)
            producto = Producto.objects.create(
                titulo=f'Aoi {sesion}', descripcion='', precio=Decimal('40.00'),
                formato_archivo='STL', archivo_3d='modelos_3d/prueba.zip',
            )
            DetalleOrden.objects.create(orden=orden, producto=producto, precio_unitario=producto.precio)

            marcar_orden_pagada(session_id=sesion)

            asunto, html = correo_enviado(post)
            self.assertEqual(asunto, asunto_esperado)
            self.assertIn(frase, html)
            self.assertIn(etiqueta, html)
            self.assertIn(f'Aoi {sesion}', html)

    @patch('core.email_utils.requests.post')
    def test_comision_pagada(self, post):
        for usuario, sesion, asunto_esperado, tipo, frase in (
            (self.cliente_en, 'com_en', 'We received your payment! 🎨', 'Motion commission', 'Total paid:'),
            (self.cliente_es, 'com_es', '¡Recibimos tu pago! 🎨', 'Comisión de Motion', 'Total pagado:'),
        ):
            post.reset_mock()
            self.comision(usuario, sesion)

            marcar_comision_pagada(session_id=sesion)

            asunto, html = correo_enviado(post)
            self.assertEqual(asunto, asunto_esperado)
            self.assertIn(tipo, html)
            self.assertIn(frase, html)
            self.assertIn('Canción (Juego)', html)  # lo que escribió el cliente no se traduce

    @patch('core.email_utils.requests.post')
    def test_comision_lista_usa_el_idioma_del_cliente_no_el_del_admin(self, post):
        admin = crear_usuario('admin@test.com', is_staff=True, idioma=ES)
        acceso = respuesta_login(admin, remember_me=False)['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {acceso}')
        comision = self.comision(self.cliente_en, 'entrega_en', estado=EstadoComision.EN_PROCESO)
        from django.core.files.uploadedfile import SimpleUploadedFile
        gif = (
            b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00'
            b'\xff\xff\xff\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00'
            b'\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
        )

        # El admin trabaja con el panel en español...
        respuesta = self.client.patch(
            f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/',
            {
                'archivo_entrega': SimpleUploadedFile('entrega.zip', b'zip'),
                'foto_entrega': SimpleUploadedFile('foto.gif', gif, content_type='image/gif'),
                'categorias': [Categoria.objects.get(nombre='Motion').id],
            },
            format='multipart', HTTP_ACCEPT_LANGUAGE='es',
        )
        self.assertEqual(respuesta.status_code, 200, respuesta.data)

        # ...pero el correo le llega al cliente en SU idioma.
        asunto, html = correo_enviado(post)
        self.assertEqual(asunto, 'Your commission is ready! 🎉')
        self.assertIn('Motion commission', html)
        self.assertIn('Download my file', html)
        # Y la petición del admin no le cambió el idioma al cliente.
        self.cliente_en.refresh_from_db()
        self.assertEqual(self.cliente_en.idioma, EN)
