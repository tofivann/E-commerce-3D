"""Chat: el contador de mensajes sin leer del menú (chat/no-leidos/)."""
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Conversacion, Mensaje

Usuario = get_user_model()
URL = '/api/v1/chat/no-leidos/'


class NoLeidosTests(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(username='admin', email='admin@test.com', password='x', is_staff=True)
        self.ana = Usuario.objects.create_user(username='ana', email='ana@test.com', password='x', estado_suscripcion='ACTIVO')
        self.beto = Usuario.objects.create_user(username='beto', email='beto@test.com', password='x', estado_suscripcion='ACTIVO')
        self.conv_ana = Conversacion.objects.create(usuario=self.ana)
        self.conv_beto = Conversacion.objects.create(usuario=self.beto)

    def mensaje(self, conversacion, remitente, texto='hola'):
        return Mensaje.objects.create(conversacion=conversacion, remitente=remitente, contenido=texto)

    def contar(self, usuario):
        self.client.force_authenticate(usuario)
        r = self.client.get(URL)
        self.assertEqual(r.status_code, 200)
        return r.data

    def test_requiere_sesion(self):
        self.assertEqual(self.client.get(URL).status_code, 401)

    def test_admin_cuenta_mensajes_de_clientes_en_todas_las_conversaciones(self):
        self.mensaje(self.conv_ana, self.ana)
        self.mensaje(self.conv_ana, self.ana)
        self.mensaje(self.conv_beto, self.beto)
        self.mensaje(self.conv_beto, self.admin, 'respuesta')   # los suyos no cuentan
        self.assertEqual(self.contar(self.admin), {'mensajes': 3, 'conversaciones': 2})

    def test_cliente_cuenta_solo_mensajes_del_admin_en_la_suya(self):
        self.mensaje(self.conv_ana, self.admin)
        self.mensaje(self.conv_ana, self.admin)
        self.mensaje(self.conv_ana, self.ana, 'yo')              # los suyos no cuentan
        self.mensaje(self.conv_beto, self.admin)                 # de otro cliente, no
        self.assertEqual(self.contar(self.ana), {'mensajes': 2, 'conversaciones': 1})
        self.assertEqual(self.contar(self.beto), {'mensajes': 1, 'conversaciones': 1})

    def test_abrir_la_conversacion_marca_como_leido(self):
        self.mensaje(self.conv_ana, self.ana)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(URL).data['mensajes'], 1)
        # Abrir los mensajes (GET) deja admin_ultimo_leido = ahora.
        self.client.get(f'/api/v1/chat/conversaciones/{self.conv_ana.pk}/mensajes/')
        self.assertEqual(self.client.get(URL).data, {'mensajes': 0, 'conversaciones': 0})
        # Un mensaje posterior vuelve a contar.
        self.mensaje(self.conv_ana, self.ana, 'otro')
        self.assertEqual(self.client.get(URL).data['mensajes'], 1)

    def test_una_sola_consulta(self):
        for _ in range(5):
            self.mensaje(self.conv_ana, self.ana)
            self.mensaje(self.conv_beto, self.beto)
        self.client.force_authenticate(self.admin)
        with self.assertNumQueries(1):   # solo el conteo (force_authenticate no consulta el usuario)
            self.client.get(URL)
