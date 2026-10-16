"""Novedades: quién ve qué, quién publica y quién comenta."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from products.tests_miniaturas import MediaTemporalMixin, portada

from .models import Comentario, FotoPublicacion, Publicacion

Usuario = get_user_model()


class BaseNovedades(MediaTemporalMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.admin = Usuario.objects.create_user(
            username='admin', email='admin@test.com', password='x', is_staff=True,
        )
        self.suscriptor = Usuario.objects.create_user(
            username='sus', email='sus@test.com', password='x', estado_suscripcion='ACTIVO',
        )
        self.pendiente = Usuario.objects.create_user(
            username='pen', email='pen@test.com', password='x', estado_suscripcion='PENDIENTE_PAGO',
        )
        self.publicada = Publicacion.objects.create(autor=self.admin, titulo='Hola', texto='Primera novedad')
        self.borrador = Publicacion.objects.create(autor=self.admin, titulo='Borrador', publicado=False)

    def url_lista(self):
        return '/api/v1/novedades/publicaciones/'

    def url_detalle(self, publicacion):
        return f'/api/v1/novedades/publicaciones/{publicacion.pk}/'

    def url_comentarios(self, publicacion):
        return f'/api/v1/novedades/publicaciones/{publicacion.pk}/comentarios/'


class VisibilidadTests(BaseNovedades):
    def test_visitante_ve_solo_publicadas(self):
        r = self.client.get(self.url_lista())
        self.assertEqual(r.status_code, 200)
        self.assertEqual([p['titulo'] for p in r.data['results']], ['Hola'])
        self.assertEqual(r.data['results'][0]['total_comentarios'], 0)

    def test_borrador_no_existe_para_visitante(self):
        self.assertEqual(self.client.get(self.url_detalle(self.borrador)).status_code, 404)
        self.assertEqual(self.client.get(self.url_comentarios(self.borrador)).status_code, 404)

    def test_staff_ve_borradores_si_los_pide(self):
        self.client.force_authenticate(self.admin)
        sin = self.client.get(self.url_lista())
        con = self.client.get(self.url_lista() + '?incluir_borradores=true')
        self.assertEqual(len(sin.data['results']), 1)
        self.assertEqual(len(con.data['results']), 2)
        # Por id entra siempre (para editarlo).
        self.assertEqual(self.client.get(self.url_detalle(self.borrador)).status_code, 200)

    def test_suscriptor_no_ve_borradores_aunque_los_pida(self):
        self.client.force_authenticate(self.suscriptor)
        r = self.client.get(self.url_lista() + '?incluir_borradores=true')
        self.assertEqual(len(r.data['results']), 1)


class PublicarTests(BaseNovedades):
    def test_solo_staff_publica(self):
        datos = {'titulo': 'Nueva', 'texto': 'x'}
        self.assertEqual(self.client.post(self.url_lista(), datos).status_code, 401)
        self.client.force_authenticate(self.suscriptor)
        self.assertEqual(self.client.post(self.url_lista(), datos).status_code, 403)

    def test_crear_con_fotos_genera_miniaturas_y_autor(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(
            self.url_lista(),
            {'titulo': 'Con fotos', 'texto': 'x', 'fotos': [portada(nombre='a.png'), portada(nombre='b.png')]},
            format='multipart',
        )
        self.assertEqual(r.status_code, 201, r.data)
        publicacion = Publicacion.objects.get(pk=r.data['id'])
        self.assertEqual(publicacion.autor, self.admin)
        fotos = list(publicacion.fotos.all())
        self.assertEqual(len(fotos), 2)
        self.assertTrue(all(f.imagen_miniatura for f in fotos))
        self.assertTrue(all(f.imagen_miniatura.name.startswith('publicaciones/miniaturas/') for f in fotos))
        self.assertEqual([f['orden'] for f in r.data['fotos']], [1, 2])

    def test_editar_quita_y_anade_fotos(self):
        self.client.force_authenticate(self.admin)
        vieja = FotoPublicacion.objects.create(publicacion=self.publicada, imagen=portada(nombre='v.png'), orden=1)
        r = self.client.patch(
            self.url_detalle(self.publicada),
            {'titulo': 'Hola editado', 'fotos_eliminar': [vieja.pk], 'fotos': [portada(nombre='n.png')]},
            format='multipart',
        )
        self.assertEqual(r.status_code, 200, r.data)
        self.publicada.refresh_from_db()
        self.assertEqual(self.publicada.titulo, 'Hola editado')
        nombres = [f.imagen.name.rsplit('/', 1)[-1] for f in self.publicada.fotos.all()]
        self.assertEqual(len(nombres), 1)
        self.assertTrue(nombres[0].startswith('n'))
        self.assertFalse(FotoPublicacion.objects.filter(pk=vieja.pk).exists())

    def test_cupo_de_fotos(self):
        self.client.force_authenticate(self.admin)
        fotos = [portada(nombre=f'{i}.png', ancho=64, alto=48) for i in range(11)]
        r = self.client.post(self.url_lista(), {'titulo': 'Muchas', 'fotos': fotos}, format='multipart')
        self.assertEqual(r.status_code, 400)
        self.assertIn('fotos', r.data)

    def test_link_youtube_sin_esquema(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(self.url_lista(), {'titulo': 'Video', 'link_youtube': 'youtube.com/watch?v=abc123'})
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['link_youtube'], 'https://youtube.com/watch?v=abc123')

    def test_borrar_publicacion_arrastra_comentarios(self):
        Comentario.objects.create(publicacion=self.publicada, usuario=self.suscriptor, texto='hola')
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(self.url_detalle(self.publicada)).status_code, 204)
        self.assertFalse(Comentario.objects.exists())


class ComentariosTests(BaseNovedades):
    def test_cualquiera_lee_comentarios(self):
        Comentario.objects.create(publicacion=self.publicada, usuario=self.suscriptor, texto='hola')
        r = self.client.get(self.url_comentarios(self.publicada))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['results'][0]['texto'], 'hola')
        self.assertEqual(r.data['results'][0]['usuario']['username'], 'sus')
        self.assertNotIn('email', r.data['results'][0]['usuario'])
        self.assertFalse(r.data['results'][0]['puede_borrar'])

    def test_comentar_requiere_acceso(self):
        self.assertEqual(self.client.post(self.url_comentarios(self.publicada), {'texto': 'x'}).status_code, 401)
        self.client.force_authenticate(self.pendiente)
        self.assertEqual(self.client.post(self.url_comentarios(self.publicada), {'texto': 'x'}).status_code, 403)

    def test_suscriptor_comenta(self):
        self.client.force_authenticate(self.suscriptor)
        r = self.client.post(self.url_comentarios(self.publicada), {'texto': '  ¡Qué lindo!  '})
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['texto'], '¡Qué lindo!')
        self.assertTrue(r.data['puede_borrar'])
        self.assertEqual(Comentario.objects.get().usuario, self.suscriptor)
        # La publicación cuenta el comentario.
        self.assertEqual(self.client.get(self.url_detalle(self.publicada)).data['total_comentarios'], 1)

    def test_comentario_vacio(self):
        self.client.force_authenticate(self.suscriptor)
        r = self.client.post(self.url_comentarios(self.publicada), {'texto': '   '})
        self.assertEqual(r.status_code, 400)
        self.assertIn('texto', r.data)

    def test_borrar_propio_ajeno_y_staff(self):
        comentario = Comentario.objects.create(publicacion=self.publicada, usuario=self.suscriptor, texto='hola')
        otro = Usuario.objects.create_user(username='otro', email='otro@test.com', password='x', estado_suscripcion='ACTIVO')
        url = f'/api/v1/novedades/comentarios/{comentario.pk}/'
        self.assertEqual(self.client.delete(url).status_code, 401)
        self.client.force_authenticate(otro)
        self.assertEqual(self.client.delete(url).status_code, 403)
        self.client.force_authenticate(self.suscriptor)
        self.assertEqual(self.client.delete(url).status_code, 204)
        # El staff borra el de cualquiera.
        otro_comentario = Comentario.objects.create(publicacion=self.publicada, usuario=otro, texto='x')
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(f'/api/v1/novedades/comentarios/{otro_comentario.pk}/').status_code, 204)
