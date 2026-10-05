"""Miniatura de la portada de un producto (Producto.imagen_miniatura)."""
import os
import shutil
import tempfile
from io import BytesIO, StringIO

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APITestCase

from .models import LADO_MINIATURA, Categoria, Producto

URL_PRODUCTOS = '/api/v1/products/products/'


def portada(ancho=1600, alto=1200, modo='RGB', nombre='portada.png'):
    """Una imagen PNG con ruido (para que pese, como una portada real)."""
    datos = BytesIO()
    Image.effect_noise((ancho, alto), 80).convert(modo).save(datos, format='PNG')
    return SimpleUploadedFile(nombre, datos.getvalue(), content_type='image/png')


class MediaTemporalMixin:
    def setUp(self):
        super().setUp()
        self.media = tempfile.mkdtemp(prefix='media-miniaturas-')
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        ajustes = override_settings(MEDIA_ROOT=self.media)
        ajustes.enable()
        self.addCleanup(ajustes.disable)

    def crear(self, **campos):
        campos.setdefault('imagen_previa', portada())
        return Producto.objects.create(
            titulo='Modelo', descripcion='x', precio=10, formato_archivo='ZIP',
            archivo_3d=SimpleUploadedFile('m.zip', b'zip'), **campos,
        )

    def abrir(self, archivo):
        with default_storage.open(archivo.name) as f:
            imagen = Image.open(f)
            imagen.load()
        return imagen

    def archivos(self, carpeta='productos_miniaturas'):
        ruta = os.path.join(self.media, carpeta)
        return sorted(os.listdir(ruta)) if os.path.isdir(ruta) else []


class MiniaturaAlGuardarTests(MediaTemporalMixin, TestCase):
    def test_al_crear_un_producto_se_genera_una_miniatura_ligera_en_webp(self):
        producto = self.crear()

        self.assertTrue(producto.imagen_miniatura.name.startswith('productos_miniaturas/'))
        self.assertTrue(producto.imagen_miniatura.name.endswith('.webp'))
        miniatura = self.abrir(producto.imagen_miniatura)
        self.assertEqual(miniatura.format, 'WEBP')
        self.assertEqual(miniatura.size, (LADO_MINIATURA, LADO_MINIATURA * 1200 // 1600))
        self.assertLess(producto.imagen_miniatura.size, producto.imagen_previa.size / 5)

    def test_la_portada_original_se_guarda_entera(self):
        original = portada()
        peso = original.size

        producto = self.crear(imagen_previa=original)

        self.assertEqual(producto.imagen_previa.size, peso)
        self.assertEqual(self.abrir(producto.imagen_previa).size, (1600, 1200))

    def test_una_portada_vertical_cabe_sin_deformarse(self):
        producto = self.crear(imagen_previa=portada(900, 1800))

        self.assertEqual(self.abrir(producto.imagen_miniatura).size, (LADO_MINIATURA // 2, LADO_MINIATURA))

    def test_una_portada_pequena_no_se_agranda(self):
        producto = self.crear(imagen_previa=portada(300, 200))

        self.assertEqual(self.abrir(producto.imagen_miniatura).size, (300, 200))

    def test_conserva_la_transparencia(self):
        datos = BytesIO()
        Image.new('RGBA', (800, 800), (232, 137, 174, 0)).save(datos, format='PNG')

        producto = self.crear(imagen_previa=SimpleUploadedFile('p.png', datos.getvalue(), content_type='image/png'))

        miniatura = self.abrir(producto.imagen_miniatura)
        self.assertEqual(miniatura.mode, 'RGBA')
        self.assertEqual(miniatura.getpixel((10, 10))[3], 0)

    def test_sin_portada_no_hay_miniatura(self):
        producto = self.crear(imagen_previa=None)

        self.assertFalse(producto.imagen_miniatura)
        self.assertEqual(self.archivos(), [])

    def test_guardar_otro_dato_no_rehace_la_miniatura(self):
        nombre = self.crear().imagen_miniatura.name

        producto = Producto.objects.get()
        producto.titulo = 'Otro título'
        producto.save()
        producto.save()

        self.assertEqual(Producto.objects.get().imagen_miniatura.name, nombre)
        self.assertEqual(len(self.archivos()), 1)

    def test_cambiar_la_portada_rehace_la_miniatura_y_borra_la_anterior(self):
        producto = self.crear()
        anterior = producto.imagen_miniatura.name

        producto = Producto.objects.get()
        producto.imagen_previa = portada(400, 400)
        producto.save()

        producto.refresh_from_db()
        self.assertNotEqual(producto.imagen_miniatura.name, anterior)
        self.assertEqual(self.abrir(producto.imagen_miniatura).size, (400, 400))
        self.assertFalse(default_storage.exists(anterior))
        self.assertEqual(len(self.archivos()), 1)

    def test_quitar_la_portada_quita_la_miniatura(self):
        producto = self.crear()
        anterior = producto.imagen_miniatura.name

        producto.imagen_previa = None
        producto.save()

        producto.refresh_from_db()
        self.assertFalse(producto.imagen_miniatura)
        self.assertFalse(default_storage.exists(anterior))

    def test_una_portada_que_ya_estaba_en_disco_tambien_genera_miniatura(self):
        """Publicar una comisión crea el producto reutilizando la foto de
        entrega, que ya está guardada: no pasa por una subida."""
        nombre = default_storage.save('comisiones/motion/entrega/foto.png', portada())

        producto = self.crear(imagen_previa=nombre)

        self.assertEqual(producto.imagen_previa.name, nombre)
        self.assertEqual(self.abrir(producto.imagen_miniatura).size[0], LADO_MINIATURA)

    def test_una_portada_ilegible_no_impide_guardar_el_producto(self):
        nombre = default_storage.save('productos_preview/rota.png', ContentFile(b'esto no es una imagen'))

        producto = self.crear(imagen_previa=nombre)

        self.assertIsNotNone(producto.pk)
        self.assertFalse(producto.imagen_miniatura)

    def test_una_portada_que_falta_en_disco_no_impide_guardar_el_producto(self):
        producto = self.crear(imagen_previa='productos_preview/no-existe.png')

        self.assertIsNotNone(producto.pk)
        self.assertFalse(producto.imagen_miniatura)

    def test_guardar_solo_otras_columnas_no_toca_la_miniatura(self):
        producto = self.crear()
        nombre = producto.imagen_miniatura.name

        producto.activo = False
        producto.save(update_fields=['activo'])

        producto.refresh_from_db()
        self.assertFalse(producto.activo)
        self.assertEqual(producto.imagen_miniatura.name, nombre)

    def test_guardar_solo_la_portada_arrastra_la_miniatura(self):
        producto = self.crear()

        producto.imagen_previa = portada(200, 200)
        producto.save(update_fields=['imagen_previa'])

        self.assertEqual(self.abrir(Producto.objects.get().imagen_miniatura).size, (200, 200))

    def test_una_instancia_cargada_sin_la_portada_se_guarda_sin_rehacer_nada(self):
        nombre = self.crear().imagen_miniatura.name

        producto = Producto.objects.only('titulo').get()
        producto.titulo = 'Otro'
        producto.save(update_fields=['titulo'])

        self.assertEqual(Producto.objects.get().imagen_miniatura.name, nombre)


class MiniaturaEnLaApiTests(MediaTemporalMixin, APITestCase):
    def setUp(self):
        super().setUp()
        Usuario = get_user_model()
        self.admin = Usuario.objects.create_user(username='admin', email='admin@test.com', password='x', is_staff=True)
        self.categoria = Categoria.objects.create(nombre='Prueba', nombre_en='Test')
        self.client.force_authenticate(self.admin)

    def datos(self, **extra):
        return {
            'titulo': 'Modelo', 'descripcion': 'x', 'precio': '10.00', 'categorias': [self.categoria.id],
            'formato_archivo': 'ZIP', 'archivo_3d': SimpleUploadedFile('m.zip', b'zip'), 'imagen_previa': portada(),
            # En multipart un booleano ausente cuenta como False: el panel lo manda siempre.
            'activo': 'true', **extra,
        }

    def test_crear_un_producto_devuelve_la_miniatura_y_se_puede_ver(self):
        respuesta = self.client.post(URL_PRODUCTOS, self.datos(), format='multipart')

        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        miniatura = respuesta.data['imagen_miniatura']
        self.assertIn('/media/productos_miniaturas/', miniatura)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(miniatura).status_code, 200)

    def test_el_catalogo_trae_la_miniatura_de_cada_producto(self):
        self.client.post(URL_PRODUCTOS, self.datos(), format='multipart')
        self.client.force_authenticate(None)

        producto = self.client.get(URL_PRODUCTOS).data['results'][0]

        self.assertIn('/media/productos_miniaturas/', producto['imagen_miniatura'])
        self.assertIn('/media/productos_preview/', producto['imagen_previa'])

    def test_la_miniatura_no_se_puede_mandar_a_mano(self):
        producto_id = self.client.post(URL_PRODUCTOS, self.datos(), format='multipart').data['id']
        nombre = Producto.objects.get().imagen_miniatura.name

        respuesta = self.client.patch(
            f'{URL_PRODUCTOS}{producto_id}/', {'imagen_miniatura': portada(50, 50)}, format='multipart',
        )

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(Producto.objects.get().imagen_miniatura.name, nombre)

    def test_cambiar_la_portada_desde_el_panel_actualiza_la_miniatura(self):
        producto_id = self.client.post(URL_PRODUCTOS, self.datos(), format='multipart').data['id']
        anterior = Producto.objects.get().imagen_miniatura.name

        respuesta = self.client.patch(
            f'{URL_PRODUCTOS}{producto_id}/', {'imagen_previa': portada(320, 240)}, format='multipart',
        )

        self.assertEqual(respuesta.status_code, 200)
        nueva = Producto.objects.get().imagen_miniatura
        self.assertNotEqual(nueva.name, anterior)
        self.assertEqual(self.abrir(nueva).size, (320, 240))


class GenerarMiniaturasTests(MediaTemporalMixin, TestCase):
    def sin_miniatura(self, **campos):
        """Un producto como los anteriores a esta función: portada sin miniatura."""
        producto = self.crear(**campos)
        if producto.imagen_miniatura:
            default_storage.delete(producto.imagen_miniatura.name)
        Producto.objects.filter(pk=producto.pk).update(imagen_miniatura=None)
        return producto

    def correr(self, *args):
        salida = StringIO()
        call_command('generar_miniaturas', *args, stdout=salida)
        return salida.getvalue()

    def test_crea_las_que_faltan_y_no_toca_las_que_ya_estan(self):
        viejo = self.sin_miniatura()
        nuevo = self.crear()
        nombre_nuevo = nuevo.imagen_miniatura.name

        salida = self.correr()

        viejo.refresh_from_db()
        nuevo.refresh_from_db()
        self.assertEqual(self.abrir(viejo.imagen_miniatura).size[0], LADO_MINIATURA)
        self.assertEqual(nuevo.imagen_miniatura.name, nombre_nuevo)
        self.assertIn('products.Producto.imagen_previa: 1 por procesar', salida)
        self.assertIn('products.Producto.imagen_previa: 1 miniaturas creadas', salida)

    def test_no_toca_la_portada_ni_los_demas_datos(self):
        producto = self.sin_miniatura()
        antes = (producto.imagen_previa.name, producto.imagen_previa.size, producto.titulo, producto.activo)

        self.correr()

        producto.refresh_from_db()
        self.assertEqual((producto.imagen_previa.name, producto.imagen_previa.size, producto.titulo, producto.activo), antes)

    def test_volver_a_correrlo_no_hace_nada(self):
        self.sin_miniatura()
        self.correr()
        nombre = Producto.objects.get().imagen_miniatura.name

        salida = self.correr()

        self.assertIn('products.Producto.imagen_previa: 0 por procesar', salida)
        self.assertEqual(Producto.objects.get().imagen_miniatura.name, nombre)
        self.assertEqual(len(self.archivos()), 1)

    def test_limite_procesa_solo_esa_cantidad(self):
        for _ in range(3):
            self.sin_miniatura(imagen_previa=portada(100, 100))

        self.correr('--limite', '2')

        self.assertEqual(Producto.objects.exclude(imagen_miniatura='').exclude(imagen_miniatura__isnull=True).count(), 2)

    def test_rehacer_reemplaza_las_existentes_sin_dejar_archivos_sueltos(self):
        anterior = self.crear().imagen_miniatura.name

        self.correr('--rehacer')

        self.assertNotEqual(Producto.objects.get().imagen_miniatura.name, anterior)
        self.assertEqual(len(self.archivos()), 1)

    def test_una_portada_ilegible_se_informa_y_no_detiene_el_resto(self):
        rota = self.sin_miniatura(imagen_previa=default_storage.save('productos_preview/rota.png', ContentFile(b'no')))
        buena = self.sin_miniatura()

        salida = self.correr()

        buena.refresh_from_db()
        self.assertTrue(buena.imagen_miniatura)
        self.assertIn(f'ids: [{rota.id}]', salida)

    def test_la_salida_no_lleva_acentos(self):
        self.sin_miniatura(imagen_previa=default_storage.save('productos_preview/rota.png', ContentFile(b'no')))

        self.correr().encode('ascii')
