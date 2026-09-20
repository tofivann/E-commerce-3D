from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from core.pagination import PaginacionEstandar
from core.text_utils import normalizar_texto
from .models import Categoria, Producto


def crear_producto(titulo, descripcion='', categorias=(), activo=True):
    producto = Producto.objects.create(
        titulo=titulo,
        descripcion=descripcion,
        precio=10,
        formato_archivo='STL',
        archivo_3d='modelos_3d/prueba.zip',
        activo=activo,
    )
    producto.categorias.set(categorias)
    return producto


class NormalizarTextoTests(APITestCase):
    def test_quita_acentos_minusculas_y_espacios(self):
        self.assertEqual(normalizar_texto('  Película Ñandú  '), 'pelicula nandu')

    def test_texto_vacio(self):
        self.assertEqual(normalizar_texto(''), '')
        self.assertEqual(normalizar_texto(None), '')


class ProductoCamposNormalizadosTests(APITestCase):
    def test_se_rellenan_al_guardar(self):
        producto = crear_producto('Canción Épica', 'Descripción con Acentos')
        producto.refresh_from_db()
        self.assertEqual(producto.titulo_normalizado, 'cancion epica')
        self.assertEqual(producto.descripcion_normalizada, 'descripcion con acentos')

    def test_se_actualizan_aunque_update_fields_no_los_incluya(self):
        producto = crear_producto('Original')
        producto.titulo = 'Cambiado'
        producto.save(update_fields=['titulo'])
        producto.refresh_from_db()
        self.assertEqual(producto.titulo_normalizado, 'cambiado')


class ProductoListadoTests(APITestCase):
    def setUp(self):
        self.url = reverse('product-list')
        self.modelo = Categoria.objects.get(nombre='Modelo')
        self.motion = Categoria.objects.get(nombre='Motion')
        self.juego = Categoria.objects.get(nombre='Juego')

    def test_respuesta_paginada_y_tamano_de_pagina(self):
        for i in range(PaginacionEstandar.page_size + 5):
            crear_producto(f'Producto {i}', categorias=[self.modelo])

        respuesta = self.client.get(self.url)

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['count'], PaginacionEstandar.page_size + 5)
        self.assertEqual(len(respuesta.data['results']), PaginacionEstandar.page_size)
        self.assertIsNotNone(respuesta.data['next'])

        segunda = self.client.get(self.url, {'page': 2})
        self.assertEqual(len(segunda.data['results']), 5)
        self.assertIsNone(segunda.data['next'])

    def test_orden_mas_nuevo_primero_y_sin_repetidos_entre_paginas(self):
        creados = [crear_producto(f'P{i}', categorias=[self.modelo]) for i in range(7)]

        ids = []
        for pagina in (1, 2, 3):
            respuesta = self.client.get(self.url, {'page': pagina, 'page_size': 3})
            ids += [p['id'] for p in respuesta.data['results']]

        self.assertEqual(ids, [p.id for p in reversed(creados)])

    def test_page_size_no_supera_el_maximo(self):
        for i in range(PaginacionEstandar.max_page_size + 1):
            crear_producto(f'P{i}', categorias=[self.modelo])

        respuesta = self.client.get(self.url, {'page_size': 10_000})
        self.assertEqual(len(respuesta.data['results']), PaginacionEstandar.max_page_size)

    def test_busqueda_ignora_acentos_y_mayusculas(self):
        crear_producto('Película de Miku', categorias=[self.modelo])
        crear_producto('Otro modelo', 'con canción épica', categorias=[self.modelo])
        crear_producto('Nada que ver', categorias=[self.modelo])

        por_titulo = self.client.get(self.url, {'search': 'PELICULA'})
        self.assertEqual([p['titulo'] for p in por_titulo.data['results']], ['Película de Miku'])

        por_descripcion = self.client.get(self.url, {'search': 'cancion epica'})
        self.assertEqual([p['titulo'] for p in por_descripcion.data['results']], ['Otro modelo'])

    def test_busqueda_vacia_devuelve_todo(self):
        crear_producto('A', categorias=[self.modelo])
        crear_producto('B', categorias=[self.modelo])

        respuesta = self.client.get(self.url, {'search': '   '})
        self.assertEqual(respuesta.data['count'], 2)

    def test_filtro_categorias_cualquiera_y_sin_duplicados(self):
        ambos = crear_producto('Modelo y Motion', categorias=[self.modelo, self.motion])
        solo_motion = crear_producto('Solo Motion', categorias=[self.motion])
        crear_producto('Solo Juego', categorias=[self.juego])

        respuesta = self.client.get(self.url, {'categorias': f'{self.modelo.id},{self.motion.id}'})

        ids = sorted(p['id'] for p in respuesta.data['results'])
        self.assertEqual(ids, sorted([ambos.id, solo_motion.id]))
        self.assertEqual(respuesta.data['count'], 2)

    def test_filtro_categorias_ignora_valores_no_numericos(self):
        crear_producto('A', categorias=[self.modelo])

        respuesta = self.client.get(self.url, {'categorias': 'abc,,'})
        self.assertEqual(respuesta.data['count'], 1)

    def test_busqueda_y_categorias_se_combinan(self):
        crear_producto('Miku modelo', categorias=[self.modelo])
        crear_producto('Miku motion', categorias=[self.motion])

        respuesta = self.client.get(self.url, {'search': 'miku', 'categorias': str(self.motion.id)})
        self.assertEqual([p['titulo'] for p in respuesta.data['results']], ['Miku motion'])

    def test_inactivos_solo_para_staff_que_los_pide(self):
        crear_producto('Activo', categorias=[self.modelo])
        crear_producto('Inactivo', categorias=[self.modelo], activo=False)

        self.assertEqual(self.client.get(self.url).data['count'], 1)

        staff = get_user_model().objects.create_user(
            username='admin', email='admin@test.com', password='x', is_staff=True,
        )
        self.client.force_authenticate(staff)
        self.assertEqual(self.client.get(self.url).data['count'], 1)
        self.assertEqual(self.client.get(self.url, {'incluir_inactivos': 'true'}).data['count'], 2)

    def test_listado_no_hace_una_consulta_por_producto(self):
        for i in range(20):
            crear_producto(f'P{i}', categorias=[self.modelo, self.motion])

        # count de la paginación + productos + categorías prefetcheadas.
        with self.assertNumQueries(3):
            self.client.get(self.url)
