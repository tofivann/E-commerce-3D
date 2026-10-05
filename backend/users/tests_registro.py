"""Registro en tres pasos (código al correo → comprobarlo → cuenta y pago) y
precio de la suscripción."""
import json
import re
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

import stripe
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from core import paypal_utils

from . import verificacion
from .models import CodigoVerificacionCorreo, Usuario
from .suscripcion import PRECIO_SUSCRIPCION
from .throttles import EnvioCodigoThrottle

EMAIL = 'nueva@test.com'
DATOS = {'username': 'nueva', 'email': EMAIL, 'nombre': 'Nueva Cuenta', 'password': 'clave-segura-123'}

URL_CODIGO = reverse('registro-codigo')
URL_VERIFICAR = reverse('registro-verificar-codigo')
URL_REGISTRO = reverse('token_register')
URL_REGISTRO_PAYPAL = reverse('token_register_paypal')
URL_PRECIO = reverse('precio-suscripcion')


def otro_codigo(codigo):
    """Un código de 6 dígitos distinto del dado."""
    return '000000' if codigo != '000000' else '111111'


class RegistroTestsBase(APITestCase):
    def setUp(self):
        # Los límites por IP viven en la caché, que no se reinicia entre tests.
        cache.clear()

    def codigo_para(self, email=EMAIL):
        """Deja un código vigente para `email` y lo devuelve en claro, sin
        pasar por el correo."""
        return verificacion._crear_codigo(email)

    def fila(self, email=EMAIL):
        return CodigoVerificacionCorreo.objects.get(email=email)

    def registrar(self, url=URL_REGISTRO, **cambios):
        with patch('users.views.stripe.checkout.Session.create') as crear_sesion, \
                patch('users.views.paypal_utils.crear_orden') as crear_orden:
            crear_sesion.return_value.url = 'https://stripe.test/pagar'
            crear_orden.return_value = {'id': 'PAYPAL-ORDEN-1'}
            respuesta = self.client.post(url, {**DATOS, **cambios}, format='json')
        self.crear_sesion, self.crear_orden = crear_sesion, crear_orden
        return respuesta


@patch('core.email_utils.requests.post')
class SolicitarCodigoTests(RegistroTestsBase):
    def correo(self, post):
        return post.call_args.kwargs['json']

    def test_manda_un_codigo_de_6_digitos_al_correo_y_no_crea_la_cuenta(self, post):
        respuesta = self.client.post(URL_CODIGO, DATOS, format='json')

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertEqual(respuesta.data, {'email': EMAIL, 'vigencia_minutos': 15, 'espera_segundos': 60})
        correo = self.correo(post)
        self.assertEqual(correo['to'], [EMAIL])
        codigo = re.match(r'^(\d{6}) es tu código de verificación', correo['subject']).group(1)
        self.assertIn(codigo, correo['html'])
        self.assertFalse(Usuario.objects.filter(email=EMAIL).exists())
        # El código que llegó al correo es el que sirve.
        self.assertEqual(self.client.post(URL_VERIFICAR, {'email': EMAIL, 'codigo': codigo}, format='json').status_code, 200)

    def test_el_codigo_no_se_guarda_en_claro_ni_viaja_en_la_respuesta(self, post):
        respuesta = self.client.post(URL_CODIGO, DATOS, format='json')

        codigo = self.correo(post)['subject'][:6]
        fila = self.fila()
        self.assertNotIn(codigo, fila.codigo_hash)
        self.assertEqual(len(fila.codigo_hash), 64)
        self.assertNotIn(codigo, json.dumps(respuesta.data))

    def test_el_correo_sale_en_el_idioma_de_la_pantalla(self, post):
        self.client.post(URL_CODIGO, DATOS, format='json', HTTP_ACCEPT_LANGUAGE='en')

        correo = self.correo(post)
        self.assertIn('is your MimiMMDart verification code', correo['subject'])
        self.assertIn('Confirm your email', correo['html'])

    def test_el_correo_se_normaliza_a_minusculas(self, post):
        self.client.post(URL_CODIGO, {**DATOS, 'email': '  Nueva@Test.COM '}, format='json')

        self.assertEqual(self.correo(post)['to'], [EMAIL])
        self.assertTrue(CodigoVerificacionCorreo.objects.filter(email=EMAIL).exists())

    def test_no_manda_codigo_si_el_correo_ya_tiene_cuenta(self, post):
        Usuario.objects.create_user(username='otra', email=EMAIL, password='x')

        respuesta = self.client.post(URL_CODIGO, DATOS, format='json')

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('email', respuesta.data)
        post.assert_not_called()

    def test_no_manda_codigo_si_el_usuario_ya_esta_tomado(self, post):
        Usuario.objects.create_user(username='nueva', email='otra@test.com', password='x')

        respuesta = self.client.post(URL_CODIGO, DATOS, format='json')

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('username', respuesta.data)
        post.assert_not_called()

    def test_no_manda_codigo_si_faltan_datos(self, post):
        respuesta = self.client.post(URL_CODIGO, {'email': EMAIL}, format='json')

        self.assertEqual(respuesta.status_code, 400)
        post.assert_not_called()

    def test_pedir_otro_enseguida_se_rechaza_y_dice_cuanto_falta(self, post):
        self.client.post(URL_CODIGO, DATOS, format='json')

        respuesta = self.client.post(URL_CODIGO, DATOS, format='json')

        self.assertEqual(respuesta.status_code, 429)
        self.assertTrue(0 < respuesta.data['espera_segundos'] <= 60)
        self.assertEqual(post.call_count, 1)

    def test_pasada_la_espera_el_codigo_nuevo_reemplaza_al_anterior(self, post):
        self.client.post(URL_CODIGO, DATOS, format='json')
        viejo = self.correo(post)['subject'][:6]
        CodigoVerificacionCorreo.objects.update(
            enviado_en=timezone.now() - verificacion.ESPERA_REENVIO - timedelta(seconds=1), intentos=3,
        )

        with patch('users.verificacion.secrets.randbelow', return_value=int(otro_codigo(viejo))):
            respuesta = self.client.post(URL_CODIGO, DATOS, format='json')

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(CodigoVerificacionCorreo.objects.count(), 1)
        self.assertEqual(self.fila().intentos, 0)
        self.assertEqual(self.client.post(URL_VERIFICAR, {'email': EMAIL, 'codigo': viejo}, format='json').status_code, 400)
        self.assertEqual(self.client.post(URL_VERIFICAR, {'email': EMAIL, 'codigo': otro_codigo(viejo)}, format='json').status_code, 200)

    def test_limpia_los_codigos_caducados_hace_mas_de_un_dia(self, post):
        self.codigo_para('vieja@test.com')
        self.codigo_para('reciente@test.com')
        ahora = timezone.now()
        CodigoVerificacionCorreo.objects.filter(email='vieja@test.com').update(expira_en=ahora - timedelta(days=2))
        CodigoVerificacionCorreo.objects.filter(email='reciente@test.com').update(expira_en=ahora - timedelta(hours=2))

        self.client.post(URL_CODIGO, DATOS, format='json')

        self.assertEqual(
            sorted(CodigoVerificacionCorreo.objects.values_list('email', flat=True)), [EMAIL, 'reciente@test.com'],
        )

    def test_una_misma_ip_no_puede_pedir_codigos_sin_limite(self, post):
        with patch.object(EnvioCodigoThrottle, 'rate', '2/hour'):
            estados = [
                self.client.post(URL_CODIGO, {**DATOS, 'username': f'u{i}', 'email': f'u{i}@test.com'}, format='json').status_code
                for i in range(3)
            ]

        self.assertEqual(estados, [200, 200, 429])
        self.assertEqual(post.call_count, 2)


class VerificarCodigoTests(RegistroTestsBase):
    def verificar(self, codigo, email=EMAIL):
        return self.client.post(URL_VERIFICAR, {'email': email, 'codigo': codigo}, format='json')

    def test_el_codigo_correcto_se_acepta_y_da_tiempo_para_pagar(self):
        codigo = self.codigo_para()

        respuesta = self.verificar(codigo)

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data, {'verificado': True})
        fila = self.fila()
        self.assertTrue(fila.verificado)
        self.assertGreater(fila.expira_en, timezone.now() + verificacion.VIGENCIA_CODIGO)

    def test_acepta_el_correo_escrito_con_mayusculas(self):
        codigo = self.codigo_para()

        self.assertEqual(self.verificar(codigo, email='NUEVA@test.com').status_code, 200)

    def test_un_codigo_equivocado_se_rechaza_y_cuenta_un_intento(self):
        codigo = self.codigo_para()

        respuesta = self.verificar(otro_codigo(codigo))

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['motivo'], verificacion.MOTIVO_INCORRECTO)
        self.assertEqual(self.fila().intentos, 1)
        self.assertFalse(self.fila().verificado)

    def test_tras_5_fallos_ni_el_codigo_correcto_sirve(self):
        codigo = self.codigo_para()

        motivos = [self.verificar(otro_codigo(codigo)).data['motivo'] for _ in range(verificacion.MAX_INTENTOS)]
        respuesta = self.verificar(codigo)

        self.assertEqual(motivos[:-1], [verificacion.MOTIVO_INCORRECTO] * (verificacion.MAX_INTENTOS - 1))
        self.assertEqual(motivos[-1], verificacion.MOTIVO_DEMASIADOS_INTENTOS)
        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['motivo'], verificacion.MOTIVO_DEMASIADOS_INTENTOS)
        self.assertEqual(self.fila().intentos, verificacion.MAX_INTENTOS)

    def test_un_codigo_vencido_se_rechaza(self):
        codigo = self.codigo_para()
        CodigoVerificacionCorreo.objects.update(expira_en=timezone.now() - timedelta(seconds=1))

        respuesta = self.verificar(codigo)

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['motivo'], verificacion.MOTIVO_EXPIRADO)

    def test_un_correo_sin_codigo_se_rechaza(self):
        respuesta = self.verificar('123456')

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['motivo'], verificacion.MOTIVO_EXPIRADO)

    def test_el_codigo_de_un_correo_no_sirve_para_otro(self):
        with patch('users.verificacion.secrets.randbelow', side_effect=[111111, 222222]):
            de_otra = self.codigo_para('otra@test.com')
            self.codigo_para()

        self.assertEqual(self.verificar(de_otra).status_code, 400)
        self.assertEqual(self.verificar(de_otra, email='otra@test.com').status_code, 200)


class RegistroTests(RegistroTestsBase):
    def test_con_el_codigo_correcto_crea_la_cuenta_pendiente_y_abre_el_pago(self):
        codigo = self.codigo_para()

        respuesta = self.registrar(codigo=codigo)

        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        self.assertEqual(respuesta.data['checkout_url'], 'https://stripe.test/pagar')
        usuario = Usuario.objects.get(email=EMAIL)
        self.assertEqual(usuario.estado_suscripcion, Usuario.EstadoSuscripcion.PENDIENTE_PAGO)
        self.assertEqual(usuario.rol, Usuario.Rol.CLIENTE)
        self.assertTrue(usuario.check_password(DATOS['password']))
        self.assertEqual(self.crear_sesion.call_args.kwargs['metadata'], {'user_id': str(usuario.id), 'tipo': 'suscripcion_usuario'})

    def test_sirve_tambien_si_ya_se_comprobo_en_el_paso_anterior(self):
        codigo = self.codigo_para()
        self.client.post(URL_VERIFICAR, {'email': EMAIL, 'codigo': codigo}, format='json')

        self.assertEqual(self.registrar(codigo=codigo).status_code, 201)

    def test_creada_la_cuenta_el_codigo_deja_de_existir(self):
        codigo = self.codigo_para()

        self.registrar(codigo=codigo)

        self.assertFalse(CodigoVerificacionCorreo.objects.filter(email=EMAIL).exists())

    def test_sin_codigo_no_se_crea_la_cuenta_ni_se_abre_el_pago(self):
        self.codigo_para()

        respuesta = self.registrar()

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('codigo', respuesta.data)
        self.assertFalse(Usuario.objects.filter(email=EMAIL).exists())
        self.crear_sesion.assert_not_called()

    def test_sin_haber_pedido_codigo_no_se_crea_la_cuenta(self):
        respuesta = self.registrar(codigo='123456')

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('codigo', respuesta.data)
        self.assertFalse(Usuario.objects.filter(email=EMAIL).exists())

    def test_un_codigo_equivocado_no_crea_la_cuenta_y_el_intento_queda_contado(self):
        codigo = self.codigo_para()

        respuesta = self.registrar(codigo=otro_codigo(codigo))

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('codigo', respuesta.data)
        self.assertFalse(Usuario.objects.filter(email=EMAIL).exists())
        self.crear_sesion.assert_not_called()
        # Si el registro revirtiera este conteo se podría adivinar el código
        # probando contra este endpoint sin límite.
        self.assertEqual(self.fila().intentos, 1)

    def test_el_registro_tampoco_deja_adivinar_el_codigo_probando(self):
        codigo = self.codigo_para()

        for _ in range(verificacion.MAX_INTENTOS):
            self.registrar(codigo=otro_codigo(codigo))
        respuesta = self.registrar(codigo=codigo)

        self.assertEqual(respuesta.status_code, 400)
        self.assertFalse(Usuario.objects.filter(email=EMAIL).exists())

    def test_un_codigo_vencido_no_crea_la_cuenta(self):
        codigo = self.codigo_para()
        CodigoVerificacionCorreo.objects.update(expira_en=timezone.now() - timedelta(seconds=1))

        respuesta = self.registrar(codigo=codigo)

        self.assertEqual(respuesta.status_code, 400)
        self.assertFalse(Usuario.objects.filter(email=EMAIL).exists())

    def test_el_codigo_de_otro_correo_no_sirve(self):
        codigo = self.codigo_para('otra@test.com')

        respuesta = self.registrar(codigo=codigo)

        self.assertEqual(respuesta.status_code, 400)
        self.assertFalse(Usuario.objects.filter(email=EMAIL).exists())

    def test_un_dato_invalido_no_gasta_un_intento_del_codigo(self):
        codigo = self.codigo_para()
        Usuario.objects.create_user(username='nueva', email='otra@test.com', password='x')

        respuesta = self.registrar(codigo=otro_codigo(codigo))

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('username', respuesta.data)
        self.assertEqual(self.fila().intentos, 0)

    def test_si_stripe_falla_no_queda_cuenta_y_el_codigo_sigue_sirviendo(self):
        codigo = self.codigo_para()

        with patch('users.views.stripe.checkout.Session.create', side_effect=stripe.StripeError('caída')):
            respuesta = self.client.post(URL_REGISTRO, {**DATOS, 'codigo': codigo}, format='json')

        self.assertEqual(respuesta.status_code, 502)
        self.assertFalse(Usuario.objects.filter(email=EMAIL).exists())
        self.assertEqual(self.registrar(codigo=codigo).status_code, 201)

    def test_paypal_crea_la_cuenta_y_devuelve_la_orden(self):
        codigo = self.codigo_para()

        respuesta = self.registrar(URL_REGISTRO_PAYPAL, codigo=codigo)

        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        self.assertEqual(respuesta.data['paypal_order_id'], 'PAYPAL-ORDEN-1')
        usuario = Usuario.objects.get(email=EMAIL)
        self.assertEqual(
            json.loads(self.crear_orden.call_args.kwargs['custom_id']),
            {'tipo': 'suscripcion_usuario', 'user_id': str(usuario.id)},
        )

    def test_paypal_tambien_exige_el_codigo(self):
        codigo = self.codigo_para()

        respuesta = self.registrar(URL_REGISTRO_PAYPAL, codigo=otro_codigo(codigo))

        self.assertEqual(respuesta.status_code, 400)
        self.assertFalse(Usuario.objects.filter(email=EMAIL).exists())
        self.crear_orden.assert_not_called()

    def test_si_paypal_falla_no_queda_cuenta_y_el_codigo_sigue_sirviendo(self):
        codigo = self.codigo_para()

        with patch('users.views.paypal_utils.crear_orden', side_effect=paypal_utils.PayPalError('caída')):
            respuesta = self.client.post(URL_REGISTRO_PAYPAL, {**DATOS, 'codigo': codigo}, format='json')

        self.assertEqual(respuesta.status_code, 502)
        self.assertFalse(Usuario.objects.filter(email=EMAIL).exists())
        self.assertTrue(CodigoVerificacionCorreo.objects.filter(email=EMAIL).exists())


class PrecioSuscripcionTests(RegistroTestsBase):
    def test_el_precio_es_publico(self):
        respuesta = self.client.get(URL_PRECIO)

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data, {'precio': f'{PRECIO_SUSCRIPCION:.2f}', 'moneda': 'USD'})

    def test_lo_que_se_anuncia_es_lo_que_se_cobra_en_las_cuatro_vias(self):
        """Registro y activación, por Stripe y por PayPal, cobran el mismo
        precio que devuelve el endpoint público — también si cambia."""
        with patch('users.views.PRECIO_SUSCRIPCION', Decimal('7.50')), \
                patch('users.suscripcion.PRECIO_SUSCRIPCION', Decimal('7.50')):
            anunciado = Decimal(self.client.get(URL_PRECIO).data['precio'])

            self.registrar(codigo=self.codigo_para())
            cobros = [Decimal(self.crear_sesion.call_args.kwargs['line_items'][0]['price_data']['unit_amount']) / 100]
            Usuario.objects.all().delete()
            self.registrar(URL_REGISTRO_PAYPAL, codigo=self.codigo_para())
            cobros.append(self.crear_orden.call_args.kwargs['total'])

            pendiente = Usuario.objects.get(email=EMAIL)
            self.client.force_authenticate(pendiente)
            with patch('users.views.stripe.checkout.Session.create') as crear_sesion, \
                    patch('users.views.paypal_utils.crear_orden', return_value={'id': 'X'}) as crear_orden:
                crear_sesion.return_value.url = 'https://stripe.test/pagar'
                self.assertEqual(self.client.post(reverse('activar-cuenta-pago')).status_code, 200)
                self.assertEqual(self.client.post(reverse('activar-cuenta-pago-paypal')).status_code, 200)
            cobros.append(Decimal(crear_sesion.call_args.kwargs['line_items'][0]['price_data']['unit_amount']) / 100)
            cobros.append(crear_orden.call_args.kwargs['total'])

        self.assertEqual(anunciado, Decimal('7.50'))
        self.assertEqual(cobros, [Decimal('7.50')] * 4)
