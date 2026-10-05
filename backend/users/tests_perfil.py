import shutil
import tempfile
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from users.perfil import LADO_FOTO, TAMANO_MAXIMO_FOTO

URL = '/api/v1/users/me/'
URL_FOTO = '/api/v1/users/me/foto/'


def imagen(ancho=800, alto=600, formato='PNG', modo='RGB', nombre='foto.png'):
    datos = BytesIO()
    Image.new(modo, (ancho, alto), (232, 137, 174) if modo == 'RGB' else (232, 137, 174, 128)).save(datos, format=formato)
    return SimpleUploadedFile(nombre, datos.getvalue(), content_type=f'image/{formato.lower()}')


class MiPerfilTests(APITestCase):
    def setUp(self):
        self.media = tempfile.mkdtemp(prefix='media-perfil-')
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        ajustes = override_settings(MEDIA_ROOT=self.media)
        ajustes.enable()
        self.addCleanup(ajustes.disable)

        Usuario = get_user_model()
        self.usuario = Usuario.objects.create_user(
            username='ana', email='ana@test.com', password='x', nombre='Ana', estado_suscripcion='PENDIENTE_PAGO',
        )
        self.otro = Usuario.objects.create_user(username='luis', email='luis@test.com', password='x', nombre='Luis')
        self.client.force_authenticate(self.usuario)

    def subir(self, archivo):
        return self.client.patch(URL, {'foto_perfil': archivo}, format='multipart')

    # ---- consultar
    def test_sin_sesion_no_hay_perfil(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(URL).status_code, 401)
        self.assertEqual(self.client.patch(URL, {'nombre': 'X'}, format='json').status_code, 401)
        self.assertEqual(self.client.delete(URL_FOTO).status_code, 401)

    def test_cualquier_cuenta_con_sesion_ve_su_perfil_aunque_no_tenga_suscripcion(self):
        dato = self.client.get(URL).json()
        self.assertEqual((dato['nombre'], dato['email'], dato['username']), ('Ana', 'ana@test.com', 'ana'))
        self.assertEqual(dato['estado_suscripcion'], 'PENDIENTE_PAGO')
        self.assertIsNone(dato['foto_perfil'])
        self.assertNotIn('password', dato)

    # ---- editar
    def test_cambia_su_nombre(self):
        respuesta = self.client.patch(URL, {'nombre': '  Ana María  '}, format='json')
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.nombre, 'Ana María')

    def test_el_nombre_no_puede_quedar_vacio(self):
        respuesta = self.client.patch(URL, {'nombre': '   '}, format='json')
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('nombre', respuesta.data)

    def test_no_puede_cambiarse_correo_rol_ni_suscripcion(self):
        respuesta = self.client.patch(URL, {
            'email': 'otro@test.com', 'rol': 'ADMIN', 'is_staff': True, 'estado_suscripcion': 'ACTIVO',
            'username': 'hack', 'nombre': 'Ana',
        }, format='json')
        self.assertEqual(respuesta.status_code, 200)
        self.usuario.refresh_from_db()
        self.assertEqual(
            (self.usuario.email, self.usuario.rol, self.usuario.is_staff, self.usuario.estado_suscripcion, self.usuario.username),
            ('ana@test.com', 'CLIENTE', False, 'PENDIENTE_PAGO', 'ana'),
        )

    def test_solo_get_y_patch(self):
        self.assertEqual(self.client.put(URL, {'nombre': 'X'}, format='json').status_code, 405)
        self.assertEqual(self.client.delete(URL).status_code, 405)

    # ---- foto
    def test_la_foto_se_guarda_cuadrada_reducida_en_jpeg_y_con_nombre_al_azar(self):
        respuesta = self.subir(imagen(1600, 900, nombre='mi-foto-privada.png'))
        self.assertEqual(respuesta.status_code, 200, respuesta.data)

        self.usuario.refresh_from_db()
        nombre = self.usuario.foto_perfil.name
        self.assertTrue(nombre.startswith('perfiles/') and nombre.endswith('.jpg'))
        self.assertNotIn('mi-foto-privada', nombre)
        guardada = Image.open(self.usuario.foto_perfil.path)
        self.assertEqual((guardada.size, guardada.format), ((LADO_FOTO, LADO_FOTO), 'JPEG'))
        self.assertTrue(respuesta.json()['foto_perfil'].endswith(nombre))

    def test_la_foto_se_puede_ver_por_su_direccion(self):
        self.subir(imagen())
        self.usuario.refresh_from_db()
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f'/media/{self.usuario.foto_perfil.name}').status_code, 200)

    def test_una_imagen_con_transparencia_se_acepta(self):
        self.assertEqual(self.subir(imagen(500, 500, modo='RGBA')).status_code, 200)

    def test_reemplazar_la_foto_borra_el_archivo_anterior(self):
        self.subir(imagen())
        self.usuario.refresh_from_db()
        primera = self.usuario.foto_perfil.path
        self.subir(imagen(300, 300))
        self.usuario.refresh_from_db()

        self.assertNotEqual(self.usuario.foto_perfil.path, primera)
        self.assertFalse(shutil.os.path.exists(primera))
        self.assertTrue(shutil.os.path.exists(self.usuario.foto_perfil.path))

    def test_cambiar_solo_el_nombre_no_toca_la_foto(self):
        self.subir(imagen())
        self.usuario.refresh_from_db()
        ruta = self.usuario.foto_perfil.path
        self.client.patch(URL, {'nombre': 'Otra'}, format='json')
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.foto_perfil.path, ruta)
        self.assertTrue(shutil.os.path.exists(ruta))

    def test_quitar_la_foto_la_borra_del_disco(self):
        self.subir(imagen())
        self.usuario.refresh_from_db()
        ruta = self.usuario.foto_perfil.path

        respuesta = self.client.delete(URL_FOTO)

        self.assertEqual(respuesta.status_code, 200)
        self.assertIsNone(respuesta.json()['foto_perfil'])
        self.usuario.refresh_from_db()
        self.assertFalse(self.usuario.foto_perfil)
        self.assertFalse(shutil.os.path.exists(ruta))
        # Quitarla otra vez no da error.
        self.assertEqual(self.client.delete(URL_FOTO).status_code, 200)

    def test_rechaza_lo_que_no_es_una_imagen(self):
        respuesta = self.subir(SimpleUploadedFile('virus.png', b'esto no es una imagen', content_type='image/png'))
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('foto_perfil', respuesta.data)
        self.usuario.refresh_from_db()
        self.assertFalse(self.usuario.foto_perfil)

    def test_rechaza_una_foto_de_mas_de_5_mb(self):
        datos = BytesIO()
        Image.new('RGB', (64, 64)).save(datos, format='PNG')
        pesada = SimpleUploadedFile('grande.png', datos.getvalue() + b'\0' * TAMANO_MAXIMO_FOTO, content_type='image/png')
        respuesta = self.subir(pesada)
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('5 MB', str(respuesta.data['foto_perfil']))

    # ---- aislamiento
    def test_cada_usuario_solo_toca_su_propio_perfil(self):
        self.subir(imagen())
        self.client.force_authenticate(self.otro)
        self.assertEqual(self.client.get(URL).json()['nombre'], 'Luis')
        self.client.patch(URL, {'nombre': 'Luis 2'}, format='json')
        self.client.delete(URL_FOTO)

        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.nombre, 'Ana')
        self.assertTrue(self.usuario.foto_perfil)

    def test_el_admin_ve_la_foto_del_cliente_en_el_chat(self):
        from chat.models import Conversacion
        self.subir(imagen())
        self.usuario.refresh_from_db()
        Conversacion.objects.create(usuario=self.usuario)
        admin = get_user_model().objects.create_user(username='admin', email='admin@test.com', password='x', is_staff=True)
        self.client.force_authenticate(admin)

        conversaciones = self.client.get('/api/v1/chat/conversaciones/').json()

        self.assertTrue(conversaciones[0]['usuario_info']['foto_perfil'].endswith(self.usuario.foto_perfil.name))
