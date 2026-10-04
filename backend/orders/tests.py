from datetime import datetime, timezone as tz
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from custom_orders.models import (
    ComisionModelo, ComisionMotion, EstadoComision, JuegoComision, TramoPersonajesMotion,
)
from products.models import Producto
from .models import DetalleOrden, Orden

URL_VENTAS = '/api/v1/orders/admin/ventas/'
URL_RESUMEN = '/api/v1/orders/admin/ventas/resumen/'


def crear_usuario(email, **extra):
    return get_user_model().objects.create_user(
        username=email, email=email, password='x', nombre=email.split('@')[0], **extra,
    )


class VentasAdminTests(APITestCase):
    """Sección "Estadísticas y pagos": qué cuenta como venta, qué entra en
    cada filtro y que el total de un filtro es la suma de lo que lista."""

    def setUp(self):
        self.cliente = crear_usuario('cliente@test.com')
        self.client.force_authenticate(crear_usuario('admin@test.com', is_staff=True))
        self.tramo = TramoPersonajesMotion.objects.create(
            nombre='Characters', min_personajes=1, max_personajes=3, precio=Decimal('40.00'),
        )
        self.juego = JuegoComision.objects.create(nombre='Bang Dream', precio=Decimal('60.00'))
        self._secuencia = 0

    def orden(self, tipo, total, estado_pago=Orden.EstadoPago.COMPLETADO, fecha=None):
        self._secuencia += 1
        orden = Orden.objects.create(
            codigo_orden=f'TEST-{self._secuencia}', usuario=self.cliente, total=Decimal(total),
            estado_pago=estado_pago, tipo_orden=tipo, pasarela_pago='Stripe',
        )
        if fecha is not None:
            # fecha_orden es auto_now_add: solo se puede fijar con update().
            Orden.objects.filter(pk=orden.pk).update(fecha_orden=fecha)
            orden.refresh_from_db()
        return orden

    def compra_tienda(self, total='10.00', titulos=('Aoi',), **kwargs):
        orden = self.orden(Orden.TipoOrden.CATALOGO, total, **kwargs)
        for titulo in titulos:
            producto = Producto.objects.create(
                titulo=titulo, descripcion='', precio=Decimal('10.00'),
                formato_archivo='STL', archivo_3d='modelos_3d/prueba.zip',
            )
            DetalleOrden.objects.create(orden=orden, producto=producto, precio_unitario=producto.precio)
        return orden

    def comision_motion(self, total='40.00', estado=EstadoComision.EN_PROCESO, **kwargs):
        orden = self.orden(Orden.TipoOrden.COMISION_MOTION, total, **kwargs)
        ComisionMotion.objects.create(
            orden=orden, usuario=self.cliente, tramo_personajes=self.tramo, nombre_juego='Juego',
            nombre_cancion='Canción', link_video='https://youtube.com/watch?v=x', estado=estado,
        )
        return orden

    def comision_modelo(self, total='60.00', estado=EstadoComision.EN_PROCESO, **kwargs):
        orden = self.orden(Orden.TipoOrden.COMISION_MODELO, total, **kwargs)
        ComisionModelo.objects.create(
            orden=orden, usuario=self.cliente, juego=self.juego, nombre_personaje='Aoi',
            foto_referencia_1='comisiones/ref.jpg', estado=estado,
        )
        return orden

    def codigos(self, **parametros):
        respuesta = self.client.get(URL_VENTAS, parametros)
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        return [venta['codigo_orden'] for venta in respuesta.data['results']]

    def escenario_completo(self):
        """Una venta de cada clase, más todo lo que NO debe contar."""
        self.tienda = self.compra_tienda('25.00')
        self.motion_en_proceso = self.comision_motion('40.00', EstadoComision.EN_PROCESO)
        self.motion_completada = self.comision_motion('45.00', EstadoComision.COMPLETADO)
        self.modelo_en_proceso = self.comision_modelo('60.00', EstadoComision.EN_PROCESO)
        self.modelo_completada = self.comision_modelo('80.00', EstadoComision.COMPLETADO)
        # No son ventas:
        self.compra_tienda('99.00', estado_pago=Orden.EstadoPago.PENDIENTE)
        self.compra_tienda('99.00', estado_pago=Orden.EstadoPago.CANCELADO)
        self.compra_tienda('99.00', estado_pago=Orden.EstadoPago.REEMBOLSADO)
        self.comision_motion('99.00', EstadoComision.SOLICITADO, estado_pago=Orden.EstadoPago.PENDIENTE)
        # Pagada y luego cancelada por el admin: tampoco cuenta.
        self.comision_motion('99.00', EstadoComision.CANCELADO)
        self.comision_modelo('99.00', EstadoComision.CANCELADO)

    def test_cada_filtro_lista_solo_lo_suyo(self):
        self.escenario_completo()
        esperado = {
            'todas': [self.tienda, self.motion_en_proceso, self.motion_completada,
                      self.modelo_en_proceso, self.modelo_completada],
            'comisiones': [self.motion_en_proceso, self.motion_completada,
                           self.modelo_en_proceso, self.modelo_completada],
            'en_proceso': [self.motion_en_proceso, self.modelo_en_proceso],
            'completadas': [self.motion_completada, self.modelo_completada],
            'tienda': [self.tienda],
        }
        for filtro, ordenes in esperado.items():
            self.assertEqual(
                sorted(self.codigos(filtro=filtro)), sorted(o.codigo_orden for o in ordenes), filtro,
            )

    def test_sin_filtro_equivale_a_todas(self):
        self.escenario_completo()
        self.assertEqual(self.codigos(), self.codigos(filtro='todas'))

    def test_el_resumen_suma_exactamente_lo_que_lista_cada_filtro(self):
        self.escenario_completo()

        resumen = self.client.get(URL_RESUMEN).data

        self.assertEqual(
            {clave: (Decimal(str(v['total'])), v['cantidad']) for clave, v in resumen.items()},
            {
                'todas': (Decimal('250.00'), 5),
                'comisiones': (Decimal('225.00'), 4),
                'en_proceso': (Decimal('100.00'), 2),
                'completadas': (Decimal('125.00'), 2),
                'tienda': (Decimal('25.00'), 1),
            },
        )
        for filtro, datos in resumen.items():
            listado = self.client.get(URL_VENTAS, {'filtro': filtro}).data
            self.assertEqual(listado['count'], datos['cantidad'], filtro)
            self.assertEqual(
                sum(Decimal(v['total']) for v in listado['results']), Decimal(str(datos['total'])), filtro,
            )

    def test_sin_ventas_el_resumen_devuelve_ceros(self):
        resumen = self.client.get(URL_RESUMEN).data
        for datos in resumen.values():
            self.assertEqual((Decimal(str(datos['total'])), datos['cantidad']), (Decimal('0'), 0))

    def test_rango_de_fechas_incluye_desde_y_excluye_hasta(self):
        antes = self.compra_tienda('1.00', fecha=datetime(2026, 9, 30, 23, 59, tzinfo=tz.utc))
        inicio = self.compra_tienda('2.00', fecha=datetime(2026, 10, 1, 0, 0, tzinfo=tz.utc))
        dentro = self.comision_motion('4.00', fecha=datetime(2026, 10, 15, 12, 0, tzinfo=tz.utc))
        limite = self.compra_tienda('8.00', fecha=datetime(2026, 11, 1, 0, 0, tzinfo=tz.utc))
        rango = {'desde': '2026-10-01T00:00:00Z', 'hasta': '2026-11-01T00:00:00Z'}

        self.assertEqual(sorted(self.codigos(**rango)), sorted([inicio.codigo_orden, dentro.codigo_orden]))
        resumen = self.client.get(URL_RESUMEN, rango).data
        self.assertEqual((Decimal(str(resumen['todas']['total'])), resumen['todas']['cantidad']), (Decimal('6.00'), 2))
        self.assertEqual(resumen['tienda']['cantidad'], 1)

        self.assertIn(antes.codigo_orden, self.codigos(hasta='2026-10-01T00:00:00Z'))
        self.assertIn(limite.codigo_orden, self.codigos(desde='2026-11-01T00:00:00Z'))

    def test_el_rango_respeta_la_zona_horaria_del_instante_recibido(self):
        # 30 sep 21:00 en UTC-4 = 1 oct 01:00 UTC: para un admin en UTC-4
        # sigue siendo septiembre.
        venta = self.compra_tienda('5.00', fecha=datetime(2026, 10, 1, 1, 0, tzinfo=tz.utc))

        octubre_local = {'desde': '2026-10-01T00:00:00-04:00', 'hasta': '2026-11-01T00:00:00-04:00'}
        septiembre_local = {'desde': '2026-09-01T00:00:00-04:00', 'hasta': '2026-10-01T00:00:00-04:00'}

        self.assertEqual(self.codigos(**octubre_local), [])
        self.assertEqual(self.codigos(**septiembre_local), [venta.codigo_orden])

    def test_parametros_invalidos_dan_400_bajo_su_nombre(self):
        for url in (URL_VENTAS, URL_RESUMEN):
            respuesta = self.client.get(url, {'desde': 'ayer'})
            self.assertEqual(respuesta.status_code, 400, url)
            self.assertIn('desde', respuesta.data)
        respuesta = self.client.get(URL_VENTAS, {'filtro': 'regalos'})
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('filtro', respuesta.data)

    def test_datos_de_cada_fila(self):
        tienda = self.compra_tienda('20.00', titulos=('Aoi', 'Miku'))
        Producto.objects.filter(titulo='Miku').delete()  # producto eliminado después de la venta
        self.comision_motion('40.00', EstadoComision.COMPLETADO)
        self.comision_modelo('60.00', EstadoComision.EN_PROCESO)

        filas = {v['tipo_orden']: v for v in self.client.get(URL_VENTAS).data['results']}

        fila_tienda = filas[Orden.TipoOrden.CATALOGO]
        self.assertEqual(fila_tienda['codigo_orden'], tienda.codigo_orden)
        self.assertEqual(sorted(fila_tienda['conceptos'], key=str), ['Aoi', None])
        self.assertIsNone(fila_tienda['estado_comision'])
        self.assertEqual(fila_tienda['cliente_email'], 'cliente@test.com')
        self.assertEqual(Decimal(fila_tienda['total']), Decimal('20.00'))
        self.assertEqual(fila_tienda['pasarela_pago'], 'Stripe')

        self.assertEqual(filas[Orden.TipoOrden.COMISION_MOTION]['conceptos'], ['Canción (Juego)'])
        self.assertEqual(filas[Orden.TipoOrden.COMISION_MOTION]['estado_comision'], EstadoComision.COMPLETADO)
        self.assertEqual(filas[Orden.TipoOrden.COMISION_MODELO]['conceptos'], ['Aoi (Bang Dream)'])
        self.assertEqual(filas[Orden.TipoOrden.COMISION_MODELO]['estado_comision'], EstadoComision.EN_PROCESO)

    def test_las_mas_recientes_primero_y_paginado(self):
        vieja = self.compra_tienda('1.00', fecha=datetime(2026, 1, 1, tzinfo=tz.utc))
        nueva = self.compra_tienda('2.00', fecha=datetime(2026, 6, 1, tzinfo=tz.utc))

        respuesta = self.client.get(URL_VENTAS, {'page_size': 1})

        self.assertEqual(respuesta.data['count'], 2)
        self.assertEqual([v['codigo_orden'] for v in respuesta.data['results']], [nueva.codigo_orden])
        self.assertIsNotNone(respuesta.data['next'])
        segunda = self.client.get(URL_VENTAS, {'page_size': 1, 'page': 2})
        self.assertEqual([v['codigo_orden'] for v in segunda.data['results']], [vieja.codigo_orden])

    def test_el_listado_no_hace_una_consulta_por_venta(self):
        for _ in range(5):
            self.compra_tienda('10.00', titulos=('A', 'B'))
            self.comision_motion('40.00')
            self.comision_modelo('60.00')

        # count + ventas (con usuario y comisión) + detalles + productos.
        with self.assertNumQueries(4):
            self.client.get(URL_VENTAS)

    def test_solo_staff(self):
        for url in (URL_VENTAS, URL_RESUMEN):
            self.client.force_authenticate(self.cliente)
            self.assertEqual(self.client.get(url).status_code, 403, url)
            self.client.force_authenticate(None)
            self.assertEqual(self.client.get(url).status_code, 401, url)
