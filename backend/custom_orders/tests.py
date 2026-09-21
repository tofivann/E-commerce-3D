from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from orders.models import Orden
from products.models import Categoria
from .models import ComisionMotion, ComisionModelo, EstadoComision, TramoPersonajesMotion
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
