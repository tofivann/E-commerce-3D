from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from orders.models import Orden
from products.models import Producto


class CheckoutLineasDeStripeTests(APITestCase):
    """Lo que se le manda a Stripe es lo que el comprador ve en la pantalla de
    pago: la línea de impuestos solo existe cuando hay impuesto, y su
    etiqueta sale de la tasa real."""

    URL = '/api/v1/cart/checkout/'

    def setUp(self):
        usuario = get_user_model().objects.create_user(
            username='cliente', email='cliente@test.com', password='x', estado_suscripcion='ACTIVO',
        )
        self.client.force_authenticate(usuario)
        for titulo, precio in (('Aoi', '100.00'), ('Miku', '50.00')):
            producto = Producto.objects.create(
                titulo=titulo, descripcion='', precio=Decimal(precio),
                formato_archivo='STL', archivo_3d='modelos_3d/prueba.zip',
            )
            self.client.post('/api/v1/cart/items/', {'producto': producto.id}, format='json')

    def pagar(self):
        with patch('shopping_cart.views.stripe.checkout.Session.create') as crear_sesion:
            crear_sesion.return_value.id = 'sess_prueba'
            crear_sesion.return_value.url = 'https://stripe.test/pagar'
            respuesta = self.client.post(self.URL)
        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        lineas = crear_sesion.call_args.kwargs['line_items']
        return [(l['price_data']['product_data']['name'], l['price_data']['unit_amount']) for l in lineas]

    def test_sin_impuesto_no_se_envia_la_linea_de_impuestos(self):
        with patch('shopping_cart.views.TASA_IMPUESTO', Decimal('0')):
            lineas = self.pagar()

        self.assertEqual(sorted(lineas), [('Aoi', 10000), ('Miku', 5000)])
        self.assertEqual(Orden.objects.get().total, Decimal('150.00'))

    def test_con_impuesto_la_etiqueta_lleva_el_porcentaje_real(self):
        with patch('shopping_cart.views.TASA_IMPUESTO', Decimal('0.08')):
            lineas = self.pagar()

        self.assertIn(('Impuestos (8%)', 1200), lineas)
        self.assertEqual(len(lineas), 3)
        self.assertEqual(Orden.objects.get().total, Decimal('162.00'))

    def test_porcentaje_con_decimales(self):
        with patch('shopping_cart.views.TASA_IMPUESTO', Decimal('0.075')):
            lineas = self.pagar()

        self.assertIn(('Impuestos (7.5%)', 1125), lineas)

    def test_lo_que_se_cobra_en_stripe_suma_el_total_de_la_orden(self):
        with patch('shopping_cart.views.TASA_IMPUESTO', Decimal('0.08')):
            lineas = self.pagar()

        self.assertEqual(sum(centavos for _, centavos in lineas), int(Orden.objects.get().total * 100))
