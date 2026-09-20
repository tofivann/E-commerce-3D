from datetime import timedelta
from unittest.mock import patch

from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Usuario
from .tokens import CLAIM_REMEMBER_ME, DURACION_SESION_CORTA

EMAIL = 'cliente@test.com'
PASSWORD = 'clave-segura-123'


def duracion(token):
    return timedelta(seconds=token['exp'] - token['iat'])


class SesionTestsBase(APITestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(username='cliente', email=EMAIL, password=PASSWORD)
        self.url_login = reverse('token_obtain_pair')
        self.url_refresh = reverse('token_refresh')
        self.url_logout = reverse('token_logout')

    def login(self, **extra):
        return self.client.post(self.url_login, {'email': EMAIL, 'password': PASSWORD, **extra}, format='json')


class LoginTests(SesionTestsBase):
    def test_respuesta_trae_tokens_y_usuario(self):
        respuesta = self.login()
        self.assertEqual(respuesta.status_code, 200)
        self.assertIn('access', respuesta.data)
        self.assertIn('refresh', respuesta.data)
        self.assertEqual(respuesta.data['user']['email'], EMAIL)
        self.assertNotIn('remember_me', respuesta.data)

    def test_sin_remember_me_el_refresh_dura_la_sesion_corta(self):
        token = RefreshToken(self.login().data['refresh'])
        self.assertIs(token[CLAIM_REMEMBER_ME], False)
        self.assertEqual(duracion(token), DURACION_SESION_CORTA)

    def test_con_remember_me_el_refresh_dura_lo_configurado(self):
        token = RefreshToken(self.login(remember_me=True).data['refresh'])
        self.assertIs(token[CLAIM_REMEMBER_ME], True)
        self.assertEqual(duracion(token), api_settings.REFRESH_TOKEN_LIFETIME)

    def test_cada_login_registra_exactamente_un_token(self):
        antes = OutstandingToken.objects.count()
        self.login()
        self.assertEqual(OutstandingToken.objects.count() - antes, 1)

    def test_credenciales_invalidas(self):
        respuesta = self.client.post(self.url_login, {'email': EMAIL, 'password': 'otra'}, format='json')
        self.assertEqual(respuesta.status_code, 401)


class RefreshTests(SesionTestsBase):
    def test_rota_y_conserva_la_sesion_corta(self):
        original = self.login().data['refresh']

        respuesta = self.client.post(self.url_refresh, {'refresh': original}, format='json')

        self.assertEqual(respuesta.status_code, 200)
        nuevo = RefreshToken(respuesta.data['refresh'])
        self.assertNotEqual(nuevo['jti'], RefreshToken(original, verify=False)['jti'])
        self.assertIs(nuevo[CLAIM_REMEMBER_ME], False)
        self.assertEqual(duracion(nuevo), DURACION_SESION_CORTA)

    def test_la_fila_del_token_rotado_vence_cuando_vence_el_token(self):
        original = self.login().data['refresh']
        nuevo = RefreshToken(self.client.post(self.url_refresh, {'refresh': original}, format='json').data['refresh'])

        fila = OutstandingToken.objects.get(jti=nuevo['jti'])
        self.assertEqual(int(fila.expires_at.timestamp()), nuevo['exp'])

    def test_rota_y_conserva_la_sesion_larga(self):
        original = self.login(remember_me=True).data['refresh']
        nuevo = RefreshToken(self.client.post(self.url_refresh, {'refresh': original}, format='json').data['refresh'])
        self.assertIs(nuevo[CLAIM_REMEMBER_ME], True)
        self.assertEqual(duracion(nuevo), api_settings.REFRESH_TOKEN_LIFETIME)

    def test_el_refresh_viejo_queda_invalidado_tras_rotar(self):
        original = self.login().data['refresh']
        self.client.post(self.url_refresh, {'refresh': original}, format='json')

        respuesta = self.client.post(self.url_refresh, {'refresh': original}, format='json')
        self.assertEqual(respuesta.status_code, 401)

    def test_token_sin_claim_se_trata_como_sesion_larga(self):
        # Tokens emitidos antes de que existiera el claim: ya duraban 7 días.
        antiguo = RefreshToken.for_user(self.usuario)
        nuevo = RefreshToken(self.client.post(self.url_refresh, {'refresh': str(antiguo)}, format='json').data['refresh'])
        self.assertEqual(duracion(nuevo), api_settings.REFRESH_TOKEN_LIFETIME)


class LogoutTests(SesionTestsBase):
    def test_logout_invalida_el_refresh_en_el_servidor(self):
        refresh = self.login().data['refresh']

        respuesta = self.client.post(self.url_logout, {'refresh': refresh}, format='json')
        self.assertEqual(respuesta.status_code, 200)
        self.assertTrue(BlacklistedToken.objects.filter(token__jti=RefreshToken(refresh, verify=False)['jti']).exists())

        renovar = self.client.post(self.url_refresh, {'refresh': refresh}, format='json')
        self.assertEqual(renovar.status_code, 401)

    def test_logout_con_token_invalido(self):
        respuesta = self.client.post(self.url_logout, {'refresh': 'no-es-un-token'}, format='json')
        self.assertEqual(respuesta.status_code, 401)


class GoogleLoginTests(SesionTestsBase):
    def setUp(self):
        super().setUp()
        self.url = reverse('google-login')

    def google_login(self, **extra):
        with patch('users.views.id_token.verify_oauth2_token', return_value={'email': EMAIL}):
            return self.client.post(self.url, {'token': 'id-token-google', **extra}, format='json')

    def test_misma_estructura_que_el_login_normal(self):
        respuesta = self.google_login()
        self.assertEqual(respuesta.status_code, 200)
        self.assertIn('access', respuesta.data)
        self.assertEqual(respuesta.data['user']['email'], EMAIL)

    def test_respeta_remember_me(self):
        corto = RefreshToken(self.google_login().data['refresh'])
        largo = RefreshToken(self.google_login(remember_me=True).data['refresh'])
        self.assertEqual(duracion(corto), DURACION_SESION_CORTA)
        self.assertEqual(duracion(largo), api_settings.REFRESH_TOKEN_LIFETIME)

    def test_falta_token(self):
        respuesta = self.client.post(self.url, {}, format='json')
        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['token'][0], 'Falta el token de Google.')

    def test_correo_no_registrado(self):
        with patch('users.views.id_token.verify_oauth2_token', return_value={'email': 'nadie@test.com'}):
            respuesta = self.client.post(self.url, {'token': 'x'}, format='json')
        self.assertEqual(respuesta.status_code, 404)

    def test_token_google_invalido(self):
        with patch('users.views.id_token.verify_oauth2_token', side_effect=ValueError('bad')):
            respuesta = self.client.post(self.url, {'token': 'x'}, format='json')
        self.assertEqual(respuesta.status_code, 400)
