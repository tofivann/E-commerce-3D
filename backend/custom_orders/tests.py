from datetime import timedelta
from decimal import Decimal
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APITestCase

from orders.models import Orden
from orders.services import marcar_orden_expirada
from products.models import Categoria, Producto
from .models import ComisionMotion, ComisionModelo, EstadoComision, JuegoComision, TramoPersonajesMotion
from .services import marcar_comision_pagada


def crear_usuario(email='cliente@test.com'):
    return get_user_model().objects.create_user(
        username=email, email=email, password='x', nombre='Cliente de Prueba',
    )


def crear_orden_comision(usuario, tipo, estado_pago=Orden.EstadoPago.PENDIENTE, session_id='sess_1'):
    return Orden.objects.create(
        codigo_orden=f'TEST-{session_id}',
        usuario=usuario,
        total=Decimal('20.00'),
        estado_pago=estado_pago,
        tipo_orden=tipo,
        pasarela_pago='Stripe',
        stripe_session_id=session_id,
    )


def crear_comision_motion(usuario, orden, estado=EstadoComision.SOLICITADO):
    tramo = TramoPersonajesMotion.objects.create(
        nombre='Characters', min_personajes=1, max_personajes=3, precio=Decimal('20.00'),
    )
    return ComisionMotion.objects.create(
        orden=orden, usuario=usuario, tramo_personajes=tramo,
        nombre_juego='Juego', nombre_cancion='Canción',
        link_video='https://youtube.com/watch?v=x', estado=estado,
    )


def imagen_de_prueba(nombre='foto.jpg'):
    contenido = (
        b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00'
        b'\xff\xff\xff\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00'
        b'\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
    )
    return SimpleUploadedFile(nombre, contenido, content_type='image/gif')


class MarcarComisionPagadaTests(APITestCase):
    """El pago confirmado (webhook Stripe/captura PayPal) debe saltar 'En
    cola' (SOLICITADO) y dejar la comisión directamente en EN_PROCESO."""

    def test_pasa_de_solicitado_a_en_proceso_al_pagar(self):
        usuario = crear_usuario()
        orden = crear_orden_comision(usuario, Orden.TipoOrden.COMISION_MOTION, session_id='sess_a')
        comision = crear_comision_motion(usuario, orden, estado=EstadoComision.SOLICITADO)

        marcar_comision_pagada(session_id='sess_a')

        comision.refresh_from_db()
        orden.refresh_from_db()
        self.assertEqual(orden.estado_pago, Orden.EstadoPago.COMPLETADO)
        self.assertEqual(comision.estado, EstadoComision.EN_PROCESO)

    def test_no_reabre_una_comision_cancelada(self):
        usuario = crear_usuario()
        orden = crear_orden_comision(usuario, Orden.TipoOrden.COMISION_MOTION, session_id='sess_b')
        comision = crear_comision_motion(usuario, orden, estado=EstadoComision.CANCELADO)

        marcar_comision_pagada(session_id='sess_b')

        comision.refresh_from_db()
        self.assertEqual(comision.estado, EstadoComision.CANCELADO)

    def test_idempotente_no_reprocesa_una_orden_ya_pagada(self):
        usuario = crear_usuario()
        orden = crear_orden_comision(
            usuario, Orden.TipoOrden.COMISION_MOTION,
            estado_pago=Orden.EstadoPago.COMPLETADO, session_id='sess_c',
        )
        # Ya se había avanzado a mano después del pago original — una segunda
        # entrega del webhook no debe pisarlo de vuelta a EN_PROCESO.
        comision = crear_comision_motion(usuario, orden, estado=EstadoComision.COMPLETADO)

        marcar_comision_pagada(session_id='sess_c')

        comision.refresh_from_db()
        self.assertEqual(comision.estado, EstadoComision.COMPLETADO)


class CompletarComisionAutomatiTests(APITestCase):
    """Subir archivo_entrega + foto_entrega + categorias (el trío exigido por
    ValidacionEntregaMixin) debe pasar la comisión a COMPLETADO sola, sin que
    el admin tenga que elegirlo aparte en un <select>."""

    def setUp(self):
        self.admin = get_user_model().objects.create_user(
            username='admin@test.com', email='admin@test.com', password='x',
            nombre='Admin', is_staff=True,
        )
        self.client.force_authenticate(self.admin)
        self.categoria = Categoria.objects.get(nombre='Modelo')

    @patch('custom_orders.views.enviar_email')
    def test_subir_archivo_completa_la_comision_automaticamente(self, mock_enviar_email):
        usuario = crear_usuario()
        orden = crear_orden_comision(
            usuario, Orden.TipoOrden.COMISION_MOTION,
            estado_pago=Orden.EstadoPago.COMPLETADO, session_id='sess_d',
        )
        comision = crear_comision_motion(usuario, orden, estado=EstadoComision.EN_PROCESO)

        respuesta = self.client.patch(
            f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/',
            data={
                'archivo_entrega': SimpleUploadedFile('modelo.zip', b'contenido'),
                'foto_entrega': imagen_de_prueba(),
                'categorias': [self.categoria.id],
            },
            format='multipart',
        )

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        comision.refresh_from_db()
        self.assertEqual(comision.estado, EstadoComision.COMPLETADO)
        mock_enviar_email.assert_called_once()

    @patch('custom_orders.views.enviar_email')
    def test_no_reabre_una_comision_cancelada_al_subir_archivo(self, mock_enviar_email):
        usuario = crear_usuario()
        orden = crear_orden_comision(
            usuario, Orden.TipoOrden.COMISION_MOTION,
            estado_pago=Orden.EstadoPago.COMPLETADO, session_id='sess_e',
        )
        comision = crear_comision_motion(usuario, orden, estado=EstadoComision.CANCELADO)

        respuesta = self.client.patch(
            f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/',
            data={
                'archivo_entrega': SimpleUploadedFile('modelo.zip', b'contenido'),
                'foto_entrega': imagen_de_prueba(),
                'categorias': [self.categoria.id],
            },
            format='multipart',
        )

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        comision.refresh_from_db()
        self.assertEqual(comision.estado, EstadoComision.CANCELADO)
        mock_enviar_email.assert_not_called()


class CancelarComisionPorAbandonoTests(APITestCase):
    """El cliente pidió la comisión pero nunca terminó de pagar: al cancelarse
    la Orden (Stripe expired / cron PayPal) la comisión también queda
    CANCELADO, en vez de SOLICITADO ("Confirmando pago") para siempre."""

    def test_stripe_expired_cancela_orden_y_comision(self):
        usuario = crear_usuario()
        orden = crear_orden_comision(usuario, Orden.TipoOrden.COMISION_MOTION, session_id='sess_abandono')
        comision = crear_comision_motion(usuario, orden)

        marcar_orden_expirada('sess_abandono')

        orden.refresh_from_db()
        comision.refresh_from_db()
        self.assertEqual(orden.estado_pago, Orden.EstadoPago.CANCELADO)
        self.assertEqual(comision.estado, EstadoComision.CANCELADO)

    def test_stripe_expired_no_toca_una_orden_ya_pagada(self):
        usuario = crear_usuario()
        orden = crear_orden_comision(
            usuario, Orden.TipoOrden.COMISION_MOTION,
            estado_pago=Orden.EstadoPago.COMPLETADO, session_id='sess_pagada',
        )
        comision = crear_comision_motion(usuario, orden, estado=EstadoComision.EN_PROCESO)

        self.assertIsNone(marcar_orden_expirada('sess_pagada'))

        orden.refresh_from_db()
        comision.refresh_from_db()
        self.assertEqual(orden.estado_pago, Orden.EstadoPago.COMPLETADO)
        self.assertEqual(comision.estado, EstadoComision.EN_PROCESO)

    def test_stripe_expired_en_orden_del_carrito_sin_comision(self):
        usuario = crear_usuario()
        orden = crear_orden_comision(usuario, Orden.TipoOrden.CATALOGO, session_id='sess_carrito')

        marcar_orden_expirada('sess_carrito')

        orden.refresh_from_db()
        self.assertEqual(orden.estado_pago, Orden.EstadoPago.CANCELADO)

    def test_cron_paypal_cancela_orden_y_comision_abandonadas(self):
        usuario = crear_usuario()
        orden = Orden.objects.create(
            codigo_orden='TEST-PP-ABANDONO', usuario=usuario, total=Decimal('20.00'),
            tipo_orden=Orden.TipoOrden.COMISION_MOTION, pasarela_pago='PayPal',
            paypal_order_id='PP-ABANDONO', estado_pago=Orden.EstadoPago.PENDIENTE,
        )
        # fecha_orden es auto_now_add: se envejece por queryset para pasar el umbral del cron.
        Orden.objects.filter(pk=orden.pk).update(fecha_orden=timezone.now() - timedelta(hours=5))
        comision = crear_comision_motion(usuario, orden)

        with patch('core.paypal_utils.consultar_orden', return_value={'status': 'VOIDED'}):
            call_command('cancelar_ordenes_paypal_expiradas', stdout=StringIO())

        orden.refresh_from_db()
        comision.refresh_from_db()
        self.assertEqual(orden.estado_pago, Orden.EstadoPago.CANCELADO)
        self.assertEqual(comision.estado, EstadoComision.CANCELADO)


class PublicarProductoTests(APITestCase):
    """Publicar no recibe body: el Producto se arma con los datos de reventa
    (DatosPublicacion) que el admin dejó guardados en la comisión al subir la
    entrega, y link_youtube se copia tal cual."""

    DATOS_PUBLICACION = {
        'titulo_publicacion': 'Miku Dance Pack',
        'descripcion_publicacion': 'Coreografía completa lista para MMD.',
        'precio_publicacion': Decimal('15.00'),
        'formato_archivo_publicacion': 'VMD',
        'link_youtube': 'https://www.youtube.com/watch?v=abc123',
    }

    def setUp(self):
        self.admin = get_user_model().objects.create_user(
            username='admin@test.com', email='admin@test.com', password='x',
            nombre='Admin', is_staff=True,
        )
        self.client.force_authenticate(self.admin)
        self.categoria = Categoria.objects.get(nombre='Motion')

    def _comision_entregada(self, **publicacion):
        usuario = crear_usuario()
        orden = crear_orden_comision(
            usuario, Orden.TipoOrden.COMISION_MOTION,
            estado_pago=Orden.EstadoPago.COMPLETADO, session_id='sess_pub',
        )
        comision = crear_comision_motion(usuario, orden, estado=EstadoComision.COMPLETADO)
        comision.archivo_entrega.save('modelo.zip', SimpleUploadedFile('modelo.zip', b'contenido'), save=False)
        comision.foto_entrega.save('foto.gif', imagen_de_prueba(), save=False)
        for campo, valor in publicacion.items():
            setattr(comision, campo, valor)
        comision.save()
        comision.categorias.set([self.categoria])
        return comision

    def test_publica_con_los_datos_guardados_y_copia_el_video(self):
        comision = self._comision_entregada(**self.DATOS_PUBLICACION)

        respuesta = self.client.post(f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/publicar/')

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        comision.refresh_from_db()
        producto = Producto.objects.get(pk=comision.producto_publicado_id)
        self.assertEqual(producto.titulo, 'Miku Dance Pack')
        self.assertEqual(producto.descripcion, 'Coreografía completa lista para MMD.')
        self.assertEqual(producto.precio, Decimal('15.00'))
        self.assertEqual(producto.formato_archivo, 'VMD')
        self.assertEqual(producto.link_youtube, 'https://www.youtube.com/watch?v=abc123')
        self.assertEqual(list(producto.categorias.all()), [self.categoria])
        # El cliente que la pidió queda con acceso al producto en su biblioteca.
        self.assertTrue(comision.usuario.compras_digitales.filter(producto=producto).exists())

    def test_sin_video_el_producto_queda_sin_link(self):
        comision = self._comision_entregada(**{**self.DATOS_PUBLICACION, 'link_youtube': ''})

        respuesta = self.client.post(f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/publicar/')

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        comision.refresh_from_db()
        self.assertIsNone(Producto.objects.get(pk=comision.producto_publicado_id).link_youtube)

    def test_no_publica_si_faltan_datos_de_reventa(self):
        # Solo el título: faltan descripción, precio y formato.
        comision = self._comision_entregada(titulo_publicacion='Solo título')

        respuesta = self.client.post(f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/publicar/')

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('datos de publicación', respuesta.data['detail'])
        comision.refresh_from_db()
        self.assertIsNone(comision.producto_publicado_id)
        self.assertEqual(Producto.objects.count(), 0)

    @patch('custom_orders.views.enviar_email')
    def test_los_datos_de_reventa_se_guardan_en_el_mismo_patch_de_entrega(self, _mock_email):
        usuario = crear_usuario()
        orden = crear_orden_comision(
            usuario, Orden.TipoOrden.COMISION_MOTION,
            estado_pago=Orden.EstadoPago.COMPLETADO, session_id='sess_patch',
        )
        comision = crear_comision_motion(usuario, orden, estado=EstadoComision.EN_PROCESO)

        respuesta = self.client.patch(
            f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/',
            data={
                'archivo_entrega': SimpleUploadedFile('modelo.zip', b'contenido'),
                'foto_entrega': imagen_de_prueba(),
                'categorias': [self.categoria.id],
                'titulo_publicacion': 'Miku Dance Pack',
                'descripcion_publicacion': 'Coreografía completa.',
                'precio_publicacion': '15.00',
                'formato_archivo_publicacion': 'VMD',
                'link_youtube': 'https://www.youtube.com/watch?v=abc123',
            },
            format='multipart',
        )

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertTrue(respuesta.data['publicacion_completa'])
        comision.refresh_from_db()
        self.assertEqual(comision.estado, EstadoComision.COMPLETADO)
        self.assertEqual(comision.titulo_publicacion, 'Miku Dance Pack')
        self.assertEqual(comision.precio_publicacion, Decimal('15.00'))
        self.assertEqual(comision.link_youtube, 'https://www.youtube.com/watch?v=abc123')

    def _patch_reventa(self, comision, **datos):
        # Reedición típica desde el modal: sin archivo ni foto (se conservan),
        # solo categorías + datos de reventa.
        return self.client.patch(
            f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/',
            data={'categorias': [self.categoria.id], **datos},
            format='multipart',
        )

    def test_respuesta_admin_trae_ids_y_detalle_de_categorias(self):
        # El modal de entrega precarga los chips desde categorias_detalle
        # (objetos con id); `categorias` son ids planos para escribir. Con
        # solo ids, el frontend mandaba "undefined" de vuelta y daba 400.
        comision = self._comision_entregada()

        respuesta = self.client.get(f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/')

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['categorias'], [self.categoria.id])
        self.assertEqual(
            [(c['id'], c['nombre']) for c in respuesta.data['categorias_detalle']],
            [(self.categoria.id, self.categoria.nombre)],
        )

    def test_reeditar_entrega_reenviando_las_mismas_categorias(self):
        # Flujo exacto del modal al reabrir una comisión ya entregada: manda
        # de vuelta los ids que leyó, sin archivo ni foto.
        comision = self._comision_entregada(**self.DATOS_PUBLICACION)

        respuesta = self._patch_reventa(comision, descripcion_publicacion='Cambiada')

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        comision.refresh_from_db()
        self.assertEqual(comision.descripcion_publicacion, 'Cambiada')
        self.assertEqual(list(comision.categorias.all()), [self.categoria])

    def test_link_de_youtube_sin_esquema_se_normaliza(self):
        comision = self._comision_entregada()

        respuesta = self._patch_reventa(comision, link_youtube='youtube.com/watch?v=abcdefghijk')

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        comision.refresh_from_db()
        self.assertEqual(comision.link_youtube, 'https://youtube.com/watch?v=abcdefghijk')

    def test_link_de_youtube_con_esquema_se_guarda_tal_cual(self):
        comision = self._comision_entregada()
        url = 'https://www.youtube.com/watch?v=abcdefghijk&list=PLxyz'

        respuesta = self._patch_reventa(comision, link_youtube=url)

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        comision.refresh_from_db()
        self.assertEqual(comision.link_youtube, url)

    def test_link_de_youtube_vacio_lo_borra(self):
        comision = self._comision_entregada(link_youtube='https://youtu.be/abcdefghijk')

        respuesta = self._patch_reventa(comision, link_youtube='')

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        comision.refresh_from_db()
        self.assertFalse(comision.link_youtube)

    def test_precio_negativo_se_rechaza_con_el_nombre_del_campo(self):
        comision = self._comision_entregada()

        respuesta = self._patch_reventa(comision, precio_publicacion='-5')

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('precio_publicacion', respuesta.data)

    def test_precio_con_coma_se_rechaza_con_el_nombre_del_campo(self):
        comision = self._comision_entregada()

        respuesta = self._patch_reventa(comision, precio_publicacion='15,50')

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('precio_publicacion', respuesta.data)

    @patch('custom_orders.views.enviar_email')
    def test_los_datos_de_reventa_son_opcionales_al_entregar(self, _mock_email):
        usuario = crear_usuario()
        orden = crear_orden_comision(
            usuario, Orden.TipoOrden.COMISION_MOTION,
            estado_pago=Orden.EstadoPago.COMPLETADO, session_id='sess_patch2',
        )
        comision = crear_comision_motion(usuario, orden, estado=EstadoComision.EN_PROCESO)

        respuesta = self.client.patch(
            f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/',
            data={
                'archivo_entrega': SimpleUploadedFile('modelo.zip', b'contenido'),
                'foto_entrega': imagen_de_prueba(),
                'categorias': [self.categoria.id],
            },
            format='multipart',
        )

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertFalse(respuesta.data['publicacion_completa'])


class MontoComisionTests(APITestCase):
    """El precio del tramo/juego es el mínimo: el cliente puede pagar más,
    nunca menos, y lo que se cobra en la pasarela es exactamente Orden.total."""

    URL_MOTION = '/api/v1/custom-orders/comisiones/motion/'
    URL_MODELO = '/api/v1/custom-orders/comisiones/modelo/'

    def setUp(self):
        self.client.force_authenticate(crear_usuario())
        self.tramo = TramoPersonajesMotion.objects.create(
            nombre='Characters', min_personajes=1, max_personajes=3, precio=Decimal('40.00'),
        )
        self.juego = JuegoComision.objects.create(nombre='Bang Dream', precio=Decimal('60.00'))

    def datos_motion(self, **extra):
        return {
            'tramo_personajes': self.tramo.id, 'nombre_juego': 'Juego', 'nombre_cancion': 'Canción',
            'link_video': 'https://youtube.com/watch?v=x', **extra,
        }

    def datos_modelo(self, **extra):
        return {
            'juego': self.juego.id, 'nombre_personaje': 'Aoi',
            'foto_referencia_1': imagen_de_prueba(), **extra,
        }

    def solicitar_motion_stripe(self, **extra):
        with patch('custom_orders.views.stripe.checkout.Session.create') as crear_sesion:
            crear_sesion.return_value.id = 'sess_monto'
            crear_sesion.return_value.url = 'https://stripe.test/pagar'
            respuesta = self.client.post(self.URL_MOTION, self.datos_motion(**extra), format='json')
        return respuesta, crear_sesion

    def centavos_cobrados(self, crear_sesion):
        return crear_sesion.call_args.kwargs['line_items'][0]['price_data']['unit_amount']

    def test_sin_monto_se_cobra_el_precio_del_tramo(self):
        respuesta, crear_sesion = self.solicitar_motion_stripe()

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(Orden.objects.get().total, Decimal('40.00'))
        self.assertEqual(self.centavos_cobrados(crear_sesion), 4000)

    def test_monto_igual_al_minimo_se_acepta(self):
        respuesta, crear_sesion = self.solicitar_motion_stripe(monto='40.00')

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(self.centavos_cobrados(crear_sesion), 4000)

    def test_monto_mayor_se_guarda_y_es_lo_que_se_cobra_en_stripe(self):
        respuesta, crear_sesion = self.solicitar_motion_stripe(monto='65.50')

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(Orden.objects.get().total, Decimal('65.50'))
        self.assertEqual(self.centavos_cobrados(crear_sesion), 6550)
        self.assertEqual(Decimal(respuesta.data['comision']['orden']['total']), Decimal('65.50'))

    def test_monto_menor_al_minimo_se_rechaza_sin_crear_nada_ni_llamar_a_stripe(self):
        respuesta, crear_sesion = self.solicitar_motion_stripe(monto='39.99')

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('monto', respuesta.data)
        self.assertFalse(Orden.objects.exists())
        self.assertFalse(ComisionMotion.objects.exists())
        crear_sesion.assert_not_called()

    def test_monto_con_formato_invalido_se_rechaza_bajo_el_campo(self):
        for invalido in ('abc', '40,50', '40.555', '-5'):
            respuesta, _ = self.solicitar_motion_stripe(monto=invalido)
            self.assertEqual(respuesta.status_code, 400, invalido)
            self.assertIn('monto', respuesta.data, invalido)
        self.assertFalse(Orden.objects.exists())

    def test_motion_por_paypal_cobra_el_monto_elegido(self):
        with patch('custom_orders.views.paypal_utils.crear_orden', return_value={'id': 'PP-1'}) as crear_orden:
            respuesta = self.client.post(
                f'{self.URL_MOTION}paypal/', self.datos_motion(monto='50'), format='json',
            )

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(Orden.objects.get().total, Decimal('50.00'))
        self.assertEqual(crear_orden.call_args.kwargs['total'], Decimal('50.00'))

    def test_modelo_por_stripe_respeta_minimo_y_monto_mayor(self):
        with patch('custom_orders.views.stripe.checkout.Session.create') as crear_sesion:
            crear_sesion.return_value.id = 'sess_modelo'
            crear_sesion.return_value.url = 'https://stripe.test/pagar'
            rechazada = self.client.post(self.URL_MODELO, self.datos_modelo(monto='59'), format='multipart')
            aceptada = self.client.post(self.URL_MODELO, self.datos_modelo(monto='80'), format='multipart')

        self.assertEqual(rechazada.status_code, 400)
        self.assertIn('monto', rechazada.data)
        self.assertEqual(aceptada.status_code, 201)
        self.assertEqual(Orden.objects.get().total, Decimal('80.00'))
        self.assertEqual(self.centavos_cobrados(crear_sesion), 8000)

    def test_modelo_por_paypal_sin_monto_cobra_el_precio_del_juego(self):
        with patch('custom_orders.views.paypal_utils.crear_orden', return_value={'id': 'PP-2'}) as crear_orden:
            respuesta = self.client.post(f'{self.URL_MODELO}paypal/', self.datos_modelo(), format='multipart')

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(crear_orden.call_args.kwargs['total'], Decimal('60.00'))
