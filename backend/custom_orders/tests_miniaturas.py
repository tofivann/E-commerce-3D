"""Miniaturas de las fotos de comisiones (core/miniaturas.py::ConMiniaturas)."""
from decimal import Decimal
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from rest_framework.test import APITestCase

from core.miniaturas import LADO_MINIATURA
from orders.models import Orden
from products.models import Categoria
from products.tests_miniaturas import MediaTemporalMixin, portada

from .models import ComisionModelo, ComisionMotion, EstadoComision, JuegoComision
from .tests import crear_comision_motion, crear_orden_comision, crear_usuario


class ComisionesMiniaturasBase(MediaTemporalMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.cliente = crear_usuario()
        self.admin = get_user_model().objects.create_user(
            username='admin@test.com', email='admin@test.com', password='x', nombre='Admin', is_staff=True,
        )

    def modelo(self, **campos):
        orden = crear_orden_comision(
            self.cliente, Orden.TipoOrden.COMISION_MODELO,
            estado_pago=Orden.EstadoPago.COMPLETADO, session_id=f'sess_{Orden.objects.count()}',
        )
        juego = JuegoComision.objects.create(nombre=f'Juego {orden.id}', precio=Decimal('20.00'))
        campos.setdefault('foto_referencia_1', portada())
        return ComisionModelo.objects.create(
            orden=orden, usuario=self.cliente, juego=juego, nombre_personaje='Miku',
            estado=EstadoComision.EN_PROCESO, **campos,
        )

    def motion(self):
        orden = crear_orden_comision(
            self.cliente, Orden.TipoOrden.COMISION_MOTION,
            estado_pago=Orden.EstadoPago.COMPLETADO, session_id=f'sess_{Orden.objects.count()}',
        )
        return crear_comision_motion(self.cliente, orden, estado=EstadoComision.EN_PROCESO)

    def entregar(self, tipo, comision):
        self.client.force_authenticate(self.admin)
        with patch('custom_orders.views.enviar_email'):
            return self.client.patch(
                f'/api/v1/custom-orders/admin/comisiones/{tipo}/{comision.id}/',
                data={
                    'archivo_entrega': SimpleUploadedFile('entrega.zip', b'zip'),
                    'foto_entrega': portada(),
                    'categorias': [Categoria.objects.get(nombre='Modelo').id],
                },
                format='multipart',
            )


class MiniaturasDeComisionesTests(ComisionesMiniaturasBase):
    def test_las_fotos_de_referencia_del_cliente_tienen_miniatura(self):
        comision = self.modelo(foto_referencia_2=portada(900, 1800))

        self.assertEqual(self.abrir(comision.foto_referencia_1_miniatura).size[0], LADO_MINIATURA)
        self.assertEqual(self.abrir(comision.foto_referencia_2_miniatura).size, (LADO_MINIATURA // 2, LADO_MINIATURA))
        self.assertTrue(comision.foto_referencia_1_miniatura.name.startswith('comisiones/miniaturas/'))
        self.assertLess(comision.foto_referencia_1_miniatura.size, comision.foto_referencia_1.size / 5)

    def test_sin_segunda_foto_ni_entrega_esas_miniaturas_quedan_vacias(self):
        comision = self.modelo()

        self.assertFalse(comision.foto_referencia_2_miniatura)
        self.assertFalse(comision.foto_entrega_miniatura)
        self.assertEqual(len(self.archivos('comisiones/miniaturas')), 1)

    def test_subir_la_entrega_crea_su_miniatura_sin_rehacer_las_de_referencia(self):
        comision = self.modelo()
        referencia = comision.foto_referencia_1_miniatura.name

        respuesta = self.entregar('modelo', comision)

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertIn('/media/comisiones/miniaturas/', respuesta.data['foto_entrega_miniatura'])
        comision.refresh_from_db()
        self.assertEqual(comision.foto_referencia_1_miniatura.name, referencia)
        self.assertEqual(self.abrir(comision.foto_entrega_miniatura).size[0], LADO_MINIATURA)
        self.assertEqual(len(self.archivos('comisiones/miniaturas')), 2)

    def test_la_entrega_de_un_motion_tambien_tiene_miniatura(self):
        comision = self.motion()

        respuesta = self.entregar('motion', comision)

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        comision.refresh_from_db()
        self.assertEqual(comision.estado, EstadoComision.COMPLETADO)
        self.assertEqual(self.abrir(comision.foto_entrega_miniatura).size[0], LADO_MINIATURA)

    def test_reemplazar_la_foto_de_entrega_reemplaza_su_miniatura(self):
        comision = self.motion()
        self.entregar('motion', comision)
        anterior = ComisionMotion.objects.get().foto_entrega_miniatura.name

        with patch('custom_orders.views.enviar_email'):
            self.client.patch(
                f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/',
                data={'foto_entrega': portada(300, 300)}, format='multipart',
            )

        nueva = ComisionMotion.objects.get().foto_entrega_miniatura
        self.assertNotEqual(nueva.name, anterior)
        self.assertEqual(self.abrir(nueva).size, (300, 300))
        self.assertFalse(default_storage.exists(anterior))

    def test_los_cambios_de_estado_no_tocan_las_miniaturas(self):
        comision = self.modelo()
        nombre = comision.foto_referencia_1_miniatura.name

        comision = ComisionModelo.objects.get()
        comision.estado = EstadoComision.CANCELADO
        comision.save(update_fields=['estado'])

        self.assertEqual(ComisionModelo.objects.get().foto_referencia_1_miniatura.name, nombre)
        self.assertEqual(len(self.archivos('comisiones/miniaturas')), 1)

    def test_la_miniatura_no_se_puede_mandar_a_mano(self):
        comision = self.motion()
        self.entregar('motion', comision)
        nombre = ComisionMotion.objects.get().foto_entrega_miniatura.name

        self.client.patch(
            f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/',
            data={'foto_entrega_miniatura': portada(50, 50)}, format='multipart',
        )

        self.assertEqual(ComisionMotion.objects.get().foto_entrega_miniatura.name, nombre)

    def test_el_cliente_recibe_las_miniaturas_y_se_pueden_ver(self):
        self.entregar('modelo', self.modelo(foto_referencia_2=portada()))
        self.client.force_authenticate(self.cliente)

        comision = self.client.get('/api/v1/custom-orders/comisiones/modelo/').data[0]

        for campo in ('foto_referencia_1_miniatura', 'foto_referencia_2_miniatura', 'foto_entrega_miniatura'):
            self.assertIn('/media/comisiones/miniaturas/', comision[campo], campo)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(comision['foto_entrega_miniatura']).status_code, 200)

    def test_el_archivo_de_entrega_sigue_cerrado(self):
        comision = self.motion()
        self.entregar('motion', comision)
        self.client.force_authenticate(None)

        respuesta = self.client.get('/media/' + ComisionMotion.objects.get().archivo_entrega.name)

        self.assertEqual(respuesta.status_code, 404)

    def test_publicar_en_la_tienda_le_da_al_producto_su_propia_miniatura(self):
        comision = self.motion()
        self.entregar('motion', comision)
        ComisionMotion.objects.filter(pk=comision.pk).update(
            titulo_publicacion='Pack', descripcion_publicacion='x', precio_publicacion=Decimal('15.00'),
            formato_archivo_publicacion='VMD',
        )

        respuesta = self.client.post(f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/publicar/')

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        producto = ComisionMotion.objects.get().producto_publicado
        self.assertTrue(producto.imagen_miniatura.name.startswith('productos_miniaturas/'))
        self.assertEqual(self.abrir(producto.imagen_miniatura).size[0], LADO_MINIATURA)


class GenerarMiniaturasDeComisionesTests(ComisionesMiniaturasBase):
    def test_el_comando_completa_las_comisiones_anteriores(self):
        comision = self.modelo(foto_referencia_2=portada())
        for archivo in self.archivos('comisiones/miniaturas'):
            default_storage.delete(f'comisiones/miniaturas/{archivo}')
        ComisionModelo.objects.update(foto_referencia_1_miniatura=None, foto_referencia_2_miniatura=None)

        salida = StringIO()
        call_command('generar_miniaturas', stdout=salida)

        comision.refresh_from_db()
        self.assertEqual(self.abrir(comision.foto_referencia_1_miniatura).size[0], LADO_MINIATURA)
        self.assertEqual(self.abrir(comision.foto_referencia_2_miniatura).size[0], LADO_MINIATURA)
        self.assertFalse(comision.foto_entrega_miniatura)
        texto = salida.getvalue()
        self.assertIn('custom_orders.ComisionModelo.foto_referencia_1: 1 miniaturas creadas', texto)
        self.assertIn('custom_orders.ComisionModelo.foto_entrega: 0 por procesar', texto)
        self.assertIn('custom_orders.ComisionMotion.foto_entrega: 0 por procesar', texto)
        texto.encode('ascii')
