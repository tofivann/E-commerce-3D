"""Monedas: ganarlas al comprar con dinero, gastarlas en el carrito y en
comisiones, devoluciones al cancelar, ajuste del admin e historial."""
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from custom_orders.models import ComisionModelo, ComisionMotion, EstadoComision, JuegoComision, TramoPersonajesMotion
from custom_orders.services import cancelar_comision_por_abandono, marcar_comision_pagada
from orders.models import ComprasDigitales, Orden
from products.models import Categoria, Producto
from products.tests_miniaturas import MediaTemporalMixin, portada
from shopping_cart.models import Carrito, CarritoItem
from shopping_cart.services import marcar_orden_pagada

from .models import Monedero, MovimientoMonedas
from .reglas import PASARELA_MONEDAS, PRECIO_EN_MONEDAS_POR_DEFECTO
from .services import SaldoInsuficiente, ajustar_saldo, registrar_movimiento, saldo_de

Tipo = MovimientoMonedas.Tipo
URL_PAGAR_CARRITO = '/api/v1/cart/checkout-monedas/'
URL_MOTION_MONEDAS = '/api/v1/custom-orders/comisiones/motion/monedas/'
URL_MODELO_MONEDAS = '/api/v1/custom-orders/comisiones/modelo/monedas/'
URL_AJUSTES = '/api/v1/monedas/admin/ajustes/'
URL_MOVIMIENTOS = '/api/v1/monedas/movimientos/'


class MonedasTestsBase(MediaTemporalMixin, APITestCase):
    def setUp(self):
        super().setUp()
        Usuario = get_user_model()
        self.cliente = Usuario.objects.create_user(
            username='ana', email='ana@test.com', password='x', nombre='Ana', estado_suscripcion='ACTIVO',
        )
        self.admin = Usuario.objects.create_user(
            username='admin', email='admin@test.com', password='x', nombre='Admin', is_staff=True,
        )
        self.client.force_authenticate(self.cliente)
        # Ningún test manda correo de verdad.
        parche = patch('core.email_utils.requests.post')
        self.correo = parche.start()
        self.addCleanup(parche.stop)

    def saldo(self, usuario=None):
        usuario = usuario or self.cliente
        return Monedero.objects.filter(usuario=usuario).values_list('saldo', flat=True).first() or 0

    def dar(self, cantidad, usuario=None):
        ajustar_saldo(usuario or self.cliente, cantidad, 'Saldo inicial del test', self.admin)

    def producto(self, titulo='Modelo', **campos):
        return Producto.objects.create(
            titulo=titulo, descripcion='x', precio=Decimal('8.00'), formato_archivo='ZIP',
            archivo_3d=SimpleUploadedFile('m.zip', b'zip'), **campos,
        )

    def al_carrito(self, *productos):
        carrito, _ = Carrito.objects.get_or_create(usuario=self.cliente)
        for producto in productos:
            CarritoItem.objects.create(carrito=carrito, producto=producto)

    def orden_con_dinero(self, *productos, session_id='sess_1'):
        """Una compra del catálogo a medio pagar con Stripe, como la deja CheckoutView."""
        orden = Orden.objects.create(
            codigo_orden=f'ORD-{session_id}', usuario=self.cliente, total=Decimal('8.00') * len(productos),
            tipo_orden=Orden.TipoOrden.CATALOGO, pasarela_pago='Stripe', stripe_session_id=session_id,
        )
        for producto in productos:
            orden.detalles.create(producto=producto, precio_unitario=producto.precio)
        return orden

    def tramo(self, **campos):
        return TramoPersonajesMotion.objects.create(
            nombre='Characters', min_personajes=1, max_personajes=3, precio=Decimal('20.00'), **campos,
        )

    def datos_motion(self, tramo):
        return {
            'tramo_personajes': tramo.id, 'nombre_juego': 'Juego', 'nombre_cancion': 'Canción',
            'link_video': 'https://youtube.com/watch?v=x',
        }

    def comision_con_dinero(self, session_id='sess_c'):
        """Una comisión de Motion a medio pagar con Stripe."""
        orden = Orden.objects.create(
            codigo_orden=f'MOT-{session_id}', usuario=self.cliente, total=Decimal('20.00'),
            tipo_orden=Orden.TipoOrden.COMISION_MOTION, pasarela_pago='Stripe', stripe_session_id=session_id,
        )
        return ComisionMotion.objects.create(
            orden=orden, usuario=self.cliente, tramo_personajes=self.tramo(), nombre_juego='J',
            nombre_cancion='C', link_video='https://youtube.com/watch?v=x',
        )

    def cancelar(self, comision):
        self.client.force_authenticate(self.admin)
        respuesta = self.client.patch(
            f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/', {'estado': 'CANCELADO'}, format='json',
        )
        self.client.force_authenticate(self.cliente)
        return respuesta


class SaldoTests(MonedasTestsBase):
    def test_un_usuario_nuevo_empieza_con_0(self):
        self.assertEqual(saldo_de(self.cliente), 0)
        self.assertFalse(Monedero.objects.exists())

    def test_sumar_y_restar_deja_el_saldo_y_el_historial(self):
        registrar_movimiento(self.cliente, 5, Tipo.AJUSTE)
        movimiento = registrar_movimiento(self.cliente, -2, Tipo.AJUSTE)

        self.assertEqual(self.saldo(), 3)
        self.assertEqual(saldo_de(self.cliente), 3)
        self.assertEqual((movimiento.cantidad, movimiento.saldo_resultante), (-2, 3))
        self.assertEqual(MovimientoMonedas.objects.count(), 2)

    def test_el_saldo_nunca_queda_negativo(self):
        registrar_movimiento(self.cliente, 3, Tipo.AJUSTE)

        with self.assertRaises(SaldoInsuficiente) as error:
            registrar_movimiento(self.cliente, -4, Tipo.AJUSTE)

        self.assertEqual((error.exception.saldo, error.exception.necesarias), (3, 4))
        self.assertEqual(self.saldo(), 3)
        self.assertEqual(MovimientoMonedas.objects.count(), 1)

    def test_recortar_quita_solo_hasta_donde_llega_el_saldo(self):
        registrar_movimiento(self.cliente, 2, Tipo.AJUSTE)

        movimiento = registrar_movimiento(self.cliente, -5, Tipo.RETIRO, recortar=True)

        self.assertEqual(self.saldo(), 0)
        self.assertEqual(movimiento.cantidad, -2)

    def test_recortar_sobre_saldo_0_no_deja_movimiento(self):
        self.assertIsNone(registrar_movimiento(self.cliente, -1, Tipo.RETIRO, recortar=True))
        self.assertFalse(MovimientoMonedas.objects.exists())

    def test_una_orden_no_produce_dos_movimientos_del_mismo_tipo(self):
        orden = self.orden_con_dinero(self.producto())

        registrar_movimiento(self.cliente, 1, Tipo.GANADA, orden=orden)
        repetido = registrar_movimiento(self.cliente, 1, Tipo.GANADA, orden=orden)

        self.assertIsNone(repetido)
        self.assertEqual(self.saldo(), 1)


class GanarMonedasTests(MonedasTestsBase):
    def test_una_compra_con_dinero_da_una_moneda_por_producto(self):
        self.orden_con_dinero(self.producto('A'), self.producto('B'), self.producto('C'))

        marcar_orden_pagada(session_id='sess_1')

        self.assertEqual(self.saldo(), 3)
        movimiento = MovimientoMonedas.objects.get()
        self.assertEqual((movimiento.tipo, movimiento.cantidad, movimiento.orden.codigo_orden), (Tipo.GANADA, 3, 'ORD-sess_1'))

    def test_el_aviso_repetido_de_la_pasarela_no_da_monedas_dos_veces(self):
        self.orden_con_dinero(self.producto())

        marcar_orden_pagada(session_id='sess_1')
        marcar_orden_pagada(session_id='sess_1')

        self.assertEqual(self.saldo(), 1)

    def test_una_compra_que_nunca_se_paga_no_da_monedas(self):
        self.orden_con_dinero(self.producto())

        self.assertEqual(self.saldo(), 0)

    def test_una_comision_pagada_con_dinero_da_una_moneda(self):
        self.comision_con_dinero()

        marcar_comision_pagada(session_id='sess_c')
        marcar_comision_pagada(session_id='sess_c')

        self.assertEqual(self.saldo(), 1)

    def test_tambien_cuenta_si_se_pago_por_paypal(self):
        orden = self.orden_con_dinero(self.producto(), self.producto('B'))
        Orden.objects.filter(pk=orden.pk).update(stripe_session_id=None, paypal_order_id='PP-1', pasarela_pago='PayPal')

        marcar_orden_pagada(paypal_order_id='PP-1')

        self.assertEqual(self.saldo(), 2)

    def test_las_monedas_son_de_quien_compro(self):
        self.orden_con_dinero(self.producto())

        marcar_orden_pagada(session_id='sess_1')

        self.assertEqual(self.saldo(self.admin), 0)


class PagarCarritoConMonedasTests(MonedasTestsBase):
    def test_paga_el_carrito_entero_y_entrega_los_productos_al_instante(self):
        a, b = self.producto('A', precio_monedas=4), self.producto('B', precio_monedas=6)
        self.al_carrito(a, b)
        self.dar(15)

        respuesta = self.client.post(URL_PAGAR_CARRITO)

        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        self.assertEqual(respuesta.data['saldo_monedas'], 5)
        orden = Orden.objects.get()
        self.assertEqual(
            (orden.estado_pago, orden.pasarela_pago, orden.total, orden.total_monedas),
            (Orden.EstadoPago.COMPLETADO, PASARELA_MONEDAS, Decimal('0'), 10),
        )
        self.assertEqual(sorted(orden.detalles.values_list('precio_monedas', 'precio_unitario')), [(4, Decimal('0')), (6, Decimal('0'))])
        self.assertEqual(ComprasDigitales.objects.filter(usuario=self.cliente, orden=orden).count(), 2)
        self.assertFalse(CarritoItem.objects.exists())
        self.assertEqual(self.saldo(), 5)

    def test_lo_pagado_con_monedas_no_da_monedas(self):
        self.al_carrito(self.producto(precio_monedas=4))
        self.dar(4)

        self.client.post(URL_PAGAR_CARRITO)

        self.assertEqual(self.saldo(), 0)
        self.assertEqual(
            list(MovimientoMonedas.objects.exclude(tipo=Tipo.AJUSTE).values_list('tipo', 'cantidad')), [(Tipo.PAGO, -4)],
        )

    def test_sin_monedas_suficientes_no_se_compra_nada(self):
        self.al_carrito(self.producto(precio_monedas=4), self.producto('B', precio_monedas=6))
        self.dar(9)

        respuesta = self.client.post(URL_PAGAR_CARRITO)

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['motivo'], 'saldo_insuficiente')
        self.assertFalse(Orden.objects.exists())
        self.assertFalse(ComprasDigitales.objects.exists())
        self.assertEqual(CarritoItem.objects.count(), 2)
        self.assertEqual(self.saldo(), 9)

    def test_un_producto_sin_precio_en_monedas_impide_pagar_el_carrito_con_monedas(self):
        self.al_carrito(self.producto('Con', precio_monedas=4), self.producto('Sin precio', precio_monedas=None))
        self.dar(50)

        respuesta = self.client.post(URL_PAGAR_CARRITO)

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['motivo'], 'no_pagable')
        self.assertIn('Sin precio', respuesta.data['detail'])
        self.assertFalse(Orden.objects.exists())
        self.assertEqual(self.saldo(), 50)

    def test_un_carrito_vacio_no_se_puede_pagar(self):
        self.dar(50)

        respuesta = self.client.post(URL_PAGAR_CARRITO)

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(self.saldo(), 50)

    def test_pulsar_dos_veces_no_cobra_dos_veces(self):
        self.al_carrito(self.producto(precio_monedas=4))
        self.dar(10)

        primera = self.client.post(URL_PAGAR_CARRITO)
        segunda = self.client.post(URL_PAGAR_CARRITO)

        self.assertEqual((primera.status_code, segunda.status_code), (201, 400))
        self.assertEqual(self.saldo(), 6)
        self.assertEqual(Orden.objects.count(), 1)

    def test_hace_falta_sesion(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.post(URL_PAGAR_CARRITO).status_code, 401)

    def test_el_recibo_habla_de_monedas_y_no_de_dolares(self):
        self.al_carrito(self.producto('Miku', precio_monedas=4))
        self.dar(4)

        self.client.post(URL_PAGAR_CARRITO)

        html = self.correo.call_args.kwargs['json']['html']
        self.assertIn('4 MimiCoins', html)
        self.assertNotIn('$', html)

    def test_el_carrito_dice_cuanto_cuesta_en_monedas(self):
        self.al_carrito(self.producto('A', precio_monedas=4), self.producto('B', precio_monedas=6))

        self.assertEqual(self.client.get('/api/v1/cart/mio/').data['total_monedas'], 10)

    def test_el_carrito_no_da_total_en_monedas_si_algun_producto_no_lo_tiene(self):
        self.al_carrito(self.producto('A', precio_monedas=4), self.producto('B', precio_monedas=None))

        self.assertIsNone(self.client.get('/api/v1/cart/mio/').data['total_monedas'])


class PagarComisionConMonedasTests(MonedasTestsBase):
    def test_una_comision_de_motion_pagada_con_monedas_queda_en_proceso(self):
        tramo = self.tramo(precio_monedas=7)
        self.dar(10)

        respuesta = self.client.post(URL_MOTION_MONEDAS, self.datos_motion(tramo), format='json')

        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        self.assertEqual(respuesta.data['saldo_monedas'], 3)
        self.assertEqual(respuesta.data['comision']['estado'], EstadoComision.EN_PROCESO)
        orden = Orden.objects.get()
        self.assertEqual(
            (orden.estado_pago, orden.pasarela_pago, orden.total, orden.total_monedas, orden.tipo_orden),
            (Orden.EstadoPago.COMPLETADO, PASARELA_MONEDAS, Decimal('0'), 7, Orden.TipoOrden.COMISION_MOTION),
        )
        # No da moneda: se pagó con monedas.
        self.assertEqual(self.saldo(), 3)
        self.assertIn('7 MimiCoins', self.correo.call_args.kwargs['json']['html'])

    def test_una_comision_de_modelo_tambien(self):
        juego = JuegoComision.objects.create(nombre='Genshin', precio=Decimal('30.00'), precio_monedas=12)
        self.dar(12)

        respuesta = self.client.post(
            URL_MODELO_MONEDAS, {'juego': juego.id, 'nombre_personaje': 'Miku', 'foto_referencia_1': portada(200, 200)},
            format='multipart',
        )

        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        self.assertEqual(ComisionModelo.objects.get().estado, EstadoComision.EN_PROCESO)
        self.assertEqual(self.saldo(), 0)

    def test_sin_monedas_suficientes_no_se_crea_la_comision(self):
        tramo = self.tramo(precio_monedas=7)
        self.dar(6)

        respuesta = self.client.post(URL_MOTION_MONEDAS, self.datos_motion(tramo), format='json')

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['motivo'], 'saldo_insuficiente')
        self.assertFalse(Orden.objects.exists())
        self.assertFalse(ComisionMotion.objects.exists())
        self.assertEqual(self.saldo(), 6)

    def test_un_tramo_sin_precio_en_monedas_no_se_puede_pagar_con_monedas(self):
        tramo = self.tramo(precio_monedas=None)
        self.dar(100)

        respuesta = self.client.post(URL_MOTION_MONEDAS, self.datos_motion(tramo), format='json')

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['motivo'], 'no_pagable')
        self.assertFalse(ComisionMotion.objects.exists())

    def test_los_datos_de_la_solicitud_se_validan_igual_que_con_dinero(self):
        self.dar(100)

        respuesta = self.client.post(URL_MOTION_MONEDAS, {'tramo_personajes': self.tramo().id}, format='json')

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('nombre_cancion', respuesta.data)
        self.assertEqual(self.saldo(), 100)


class CancelarComisionTests(MonedasTestsBase):
    def test_cancelar_una_comision_pagada_con_monedas_las_devuelve(self):
        self.dar(10)
        self.client.post(URL_MOTION_MONEDAS, self.datos_motion(self.tramo(precio_monedas=7)), format='json')
        comision = ComisionMotion.objects.get()

        respuesta = self.cancelar(comision)

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertEqual(self.saldo(), 10)
        self.assertTrue(MovimientoMonedas.objects.filter(tipo=Tipo.DEVOLUCION, cantidad=7, orden=comision.orden).exists())

    def test_cancelar_dos_veces_no_devuelve_dos_veces(self):
        self.dar(10)
        self.client.post(URL_MOTION_MONEDAS, self.datos_motion(self.tramo(precio_monedas=7)), format='json')
        comision = ComisionMotion.objects.get()

        self.cancelar(comision)
        self.cancelar(comision)

        self.assertEqual(self.saldo(), 10)

    def test_cancelar_una_comision_pagada_con_dinero_quita_la_moneda_que_dio(self):
        comision = self.comision_con_dinero()
        marcar_comision_pagada(session_id='sess_c')
        self.dar(4)

        self.cancelar(comision)

        self.assertEqual(self.saldo(), 4)
        self.assertTrue(MovimientoMonedas.objects.filter(tipo=Tipo.RETIRO, cantidad=-1).exists())

    def test_si_ya_gasto_esa_moneda_el_saldo_se_queda_en_0_no_en_negativo(self):
        comision = self.comision_con_dinero()
        marcar_comision_pagada(session_id='sess_c')
        registrar_movimiento(self.cliente, -1, Tipo.AJUSTE)

        respuesta = self.cancelar(comision)

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(self.saldo(), 0)

    def test_una_comision_abandonada_sin_pagar_no_mueve_monedas(self):
        comision = self.comision_con_dinero()
        self.dar(3)

        cancelar_comision_por_abandono(comision.orden)

        self.assertEqual(self.saldo(), 3)
        self.assertFalse(MovimientoMonedas.objects.exclude(tipo=Tipo.AJUSTE).exists())

    def test_otros_cambios_de_una_comision_no_mueven_monedas(self):
        comision = self.comision_con_dinero()
        marcar_comision_pagada(session_id='sess_c')
        self.client.force_authenticate(self.admin)

        self.client.patch(
            f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/', {'titulo_publicacion': 'Pack'}, format='json',
        )

        self.assertEqual(self.saldo(), 1)


class AjusteDelAdminTests(MonedasTestsBase):
    def ajustar(self, **datos):
        return self.client.post(URL_AJUSTES, {'usuario': self.cliente.id, 'nota': 'Regalo', **datos}, format='json')

    def test_el_admin_suma_y_quita_monedas_y_queda_registrado(self):
        self.client.force_authenticate(self.admin)

        suma = self.ajustar(cantidad=20)
        resta = self.ajustar(cantidad=-5, nota='Corrección')

        self.assertEqual((suma.status_code, resta.status_code), (200, 200))
        self.assertEqual(resta.data, {'usuario': self.cliente.id, 'saldo_monedas': 15})
        ultimo = MovimientoMonedas.objects.first()
        self.assertEqual((ultimo.tipo, ultimo.cantidad, ultimo.nota, ultimo.creado_por), (Tipo.AJUSTE, -5, 'Corrección', self.admin))

    def test_no_puede_dejar_el_saldo_en_negativo(self):
        self.client.force_authenticate(self.admin)
        self.ajustar(cantidad=3)

        respuesta = self.ajustar(cantidad=-4)

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('cantidad', respuesta.data)
        self.assertEqual(self.saldo(), 3)

    def test_exige_un_motivo_y_una_cantidad_distinta_de_0(self):
        self.client.force_authenticate(self.admin)

        self.assertIn('nota', self.ajustar(cantidad=5, nota='  ').data)
        self.assertIn('cantidad', self.ajustar(cantidad=0).data)
        self.assertEqual(self.saldo(), 0)

    def test_un_cliente_no_puede_ajustar_monedas_ni_las_suyas(self):
        respuesta = self.ajustar(cantidad=1000)

        self.assertEqual(respuesta.status_code, 403)
        self.assertEqual(self.saldo(), 0)

    def test_sin_sesion_tampoco(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.ajustar(cantidad=5).status_code, 401)


class VerMonedasTests(MonedasTestsBase):
    def test_el_perfil_trae_el_saldo(self):
        self.dar(7)

        self.assertEqual(self.client.get('/api/v1/users/me/').data['saldo_monedas'], 7)

    def test_el_saldo_no_se_puede_cambiar_desde_el_perfil(self):
        self.dar(7)

        self.client.patch('/api/v1/users/me/', {'saldo_monedas': 9999, 'nombre': 'Ana'}, format='json')

        self.assertEqual(self.saldo(), 7)

    def test_el_historial_es_solo_el_propio_y_lo_mas_reciente_va_primero(self):
        self.dar(7)
        registrar_movimiento(self.cliente, -2, Tipo.AJUSTE, nota='Segundo')
        self.dar(99, usuario=self.admin)

        respuesta = self.client.get(URL_MOVIMIENTOS)

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['count'], 2)
        self.assertEqual([m['cantidad'] for m in respuesta.data['results']], [-2, 7])
        self.assertEqual(respuesta.data['results'][0]['saldo_resultante'], 5)

    def test_el_historial_dice_de_que_orden_vino_cada_moneda(self):
        self.orden_con_dinero(self.producto())
        marcar_orden_pagada(session_id='sess_1')

        movimiento = self.client.get(URL_MOVIMIENTOS).data['results'][0]

        self.assertEqual((movimiento['tipo'], movimiento['codigo_orden']), (Tipo.GANADA, 'ORD-sess_1'))

    def test_el_historial_exige_sesion(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get(URL_MOVIMIENTOS).status_code, 401)

    def test_la_tabla_de_usuarios_del_admin_trae_el_saldo_sin_una_consulta_por_fila(self):
        self.dar(7)
        Usuario = get_user_model()
        for i in range(5):
            Usuario.objects.create_user(username=f'u{i}', email=f'u{i}@test.com', password='x')
        self.client.force_authenticate(self.admin)

        with self.assertNumQueries(1):
            usuarios = self.client.get('/api/v1/users/users/').data

        self.assertEqual({u['email']: u['saldo_monedas'] for u in usuarios}['ana@test.com'], 7)
        self.assertEqual(len(usuarios), 7)


class PreciosEnMonedasTests(MonedasTestsBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.admin)
        self.categoria = Categoria.objects.create(nombre='Prueba', nombre_en='Test')

    def datos_producto(self, **extra):
        return {
            'titulo': 'Modelo', 'descripcion': 'x', 'precio': '10.00', 'categorias': [self.categoria.id],
            'formato_archivo': 'ZIP', 'archivo_3d': SimpleUploadedFile('m.zip', b'zip'), 'activo': 'true', **extra,
        }

    def test_un_producto_nuevo_nace_con_el_precio_en_monedas_por_defecto(self):
        respuesta = self.client.post('/api/v1/products/products/', self.datos_producto(), format='multipart')

        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        self.assertEqual(respuesta.data['precio_monedas'], PRECIO_EN_MONEDAS_POR_DEFECTO)
        self.assertEqual(PRECIO_EN_MONEDAS_POR_DEFECTO, 10)

    def test_el_admin_puede_ponerle_otro_precio_o_dejarlo_sin_precio_en_monedas(self):
        producto_id = self.client.post(
            '/api/v1/products/products/', self.datos_producto(precio_monedas='25'), format='multipart',
        ).data['id']
        self.assertEqual(Producto.objects.get().precio_monedas, 25)

        respuesta = self.client.patch(f'/api/v1/products/products/{producto_id}/', {'precio_monedas': ''}, format='multipart')

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertIsNone(Producto.objects.get().precio_monedas)

    def test_el_precio_en_monedas_no_puede_ser_0_ni_negativo(self):
        for valor in ('0', '-3'):
            respuesta = self.client.post(
                '/api/v1/products/products/', self.datos_producto(precio_monedas=valor), format='multipart',
            )
            self.assertEqual(respuesta.status_code, 400, valor)
            self.assertIn('precio_monedas', respuesta.data)

    def test_el_catalogo_muestra_el_precio_en_monedas(self):
        self.producto(precio_monedas=4)
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get('/api/v1/products/products/').data['results'][0]['precio_monedas'], 4)

    def test_tramos_y_juegos_nacen_con_10_y_el_admin_los_cambia(self):
        tramo = self.client.post(
            '/api/v1/custom-orders/tramos-motion/',
            {'nombre': 'Characters', 'min_personajes': 1, 'max_personajes': 3, 'precio': '20.00'}, format='json',
        )
        juego = self.client.post('/api/v1/custom-orders/juegos/', {'nombre': 'Genshin', 'precio': '30.00'}, format='json')
        self.assertEqual((tramo.data['precio_monedas'], juego.data['precio_monedas']), (10, 10))

        cambiado = self.client.patch(f"/api/v1/custom-orders/juegos/{juego.data['id']}/", {'precio_monedas': 40}, format='json')

        self.assertEqual(cambiado.data['precio_monedas'], 40)

    def test_un_cliente_no_puede_cambiar_precios_en_monedas(self):
        juego = JuegoComision.objects.create(nombre='Genshin', precio=Decimal('30.00'))
        self.client.force_authenticate(self.cliente)

        respuesta = self.client.patch(f'/api/v1/custom-orders/juegos/{juego.id}/', {'precio_monedas': 1}, format='json')

        self.assertEqual(respuesta.status_code, 403)

    def test_publicar_una_comision_copia_su_precio_en_monedas_al_producto(self):
        comision = self.comision_con_dinero()
        marcar_comision_pagada(session_id='sess_c')
        with patch('custom_orders.views.enviar_email'):
            self.client.patch(
                f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/',
                data={
                    'archivo_entrega': SimpleUploadedFile('e.zip', b'zip'), 'foto_entrega': portada(200, 200),
                    'categorias': [self.categoria.id], 'titulo_publicacion': 'Pack', 'descripcion_publicacion': 'x',
                    'precio_publicacion': '15.00', 'formato_archivo_publicacion': 'VMD', 'precio_monedas_publicacion': '33',
                },
                format='multipart',
            )

        respuesta = self.client.post(f'/api/v1/custom-orders/admin/comisiones/motion/{comision.id}/publicar/')

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertEqual(Producto.objects.get().precio_monedas, 33)
        # Recibir en la biblioteca el producto de su propia comisión no es una compra: no da moneda.
        self.assertEqual(self.saldo(), 1)


class VentasConMonedasTests(MonedasTestsBase):
    def test_una_compra_con_monedas_aparece_en_estadisticas_sin_sumar_dolares(self):
        self.orden_con_dinero(self.producto('De pago'))
        marcar_orden_pagada(session_id='sess_1')
        self.al_carrito(self.producto('Con monedas', precio_monedas=1))
        self.client.post(URL_PAGAR_CARRITO)
        self.client.force_authenticate(self.admin)

        ventas = self.client.get('/api/v1/orders/admin/ventas/').data
        resumen = self.client.get('/api/v1/orders/admin/ventas/resumen/').data

        self.assertEqual(ventas['count'], 2)
        con_monedas = next(v for v in ventas['results'] if v['pasarela_pago'] == PASARELA_MONEDAS)
        self.assertEqual((Decimal(con_monedas['total']), con_monedas['total_monedas']), (Decimal('0'), 1))
        self.assertEqual(Decimal(str(resumen['todas']['total'])), Decimal('8.00'))
