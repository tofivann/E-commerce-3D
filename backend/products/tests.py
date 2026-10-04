from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from core.pagination import PaginacionEstandar
from core.text_utils import normalizar_texto
from .models import Categoria, Favorito, Producto


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

    def test_filtro_categorias_basta_con_una_y_sin_duplicados(self):
        ambos = crear_producto('Modelo y Motion', categorias=[self.modelo, self.motion])
        las_tres = crear_producto('Las tres', categorias=[self.modelo, self.motion, self.juego])
        solo_motion = crear_producto('Solo Motion', categorias=[self.motion])
        solo_modelo = crear_producto('Solo Modelo', categorias=[self.modelo])
        crear_producto('Solo Juego', categorias=[self.juego])

        respuesta = self.client.get(self.url, {'categorias': f'{self.modelo.id},{self.motion.id}'})

        # "Al menos una": todo lo que tenga Modelo o Motion, y no lo que es
        # solo Juego. Los que tienen las dos salen una sola vez (el join al
        # M2M los duplicaría sin distinct(), y el count de la paginación
        # también quedaría inflado).
        ids = [p['id'] for p in respuesta.data['results']]
        self.assertEqual(sorted(ids), sorted([ambos.id, las_tres.id, solo_motion.id, solo_modelo.id]))
        self.assertEqual(respuesta.data['count'], 4)

    def test_filtro_una_categoria_incluye_los_que_tienen_mas(self):
        ambos = crear_producto('Modelo y Motion', categorias=[self.modelo, self.motion])
        solo_motion = crear_producto('Solo Motion', categorias=[self.motion])
        crear_producto('Solo Modelo', categorias=[self.modelo])

        respuesta = self.client.get(self.url, {'categorias': str(self.motion.id)})

        # Marcar "Motion" devuelve todo lo que tenga Motion, tenga o no más.
        self.assertEqual(
            sorted(p['id'] for p in respuesta.data['results']), sorted([ambos.id, solo_motion.id]),
        )

    def test_filtro_categorias_con_categoria_inexistente_no_devuelve_nada(self):
        crear_producto('Solo Modelo', categorias=[self.modelo])

        respuesta = self.client.get(self.url, {'categorias': '99999'})
        self.assertEqual(respuesta.data['count'], 0)

    def test_filtro_categorias_ignora_ids_repetidos(self):
        producto = crear_producto('Motion', categorias=[self.motion])

        respuesta = self.client.get(self.url, {'categorias': f'{self.motion.id},{self.motion.id}'})

        self.assertEqual([p['id'] for p in respuesta.data['results']], [producto.id])

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


class CategoriasProtegidasTests(APITestCase):
    """Modelo, Motion y Juego no se editan ni se borran, ni siendo staff."""

    BASE = '/api/v1/products/categorias/'

    def setUp(self):
        staff = get_user_model().objects.create_user(
            username='admin', email='admin@test.com', password='x', is_staff=True,
        )
        self.client.force_authenticate(staff)
        self.modelo = Categoria.objects.get(nombre='Modelo')
        self.otra = Categoria.objects.create(nombre='Bang Dream', nombre_en='Bang Dream')

    def url(self, categoria):
        return f'{self.BASE}{categoria.id}/'

    def test_el_listado_marca_solo_las_principales_como_protegidas(self):
        respuesta = self.client.get(self.BASE)
        protegidas = {c['nombre'] for c in respuesta.data if c['protegida']}
        self.assertEqual(protegidas, {'Modelo', 'Motion', 'Juego'})

    def test_no_se_puede_renombrar_ni_desactivar_una_principal(self):
        for cambio in ({'nombre': 'Otro'}, {'nombre_en': 'Other'}, {'activo': False}):
            respuesta = self.client.patch(self.url(self.modelo), cambio)
            self.assertEqual(respuesta.status_code, 403, cambio)
        self.modelo.refresh_from_db()
        self.assertEqual((self.modelo.nombre, self.modelo.activo), ('Modelo', True))

    def test_no_se_puede_borrar_una_principal_y_los_productos_conservan_la_etiqueta(self):
        producto = crear_producto('P', categorias=[self.modelo])

        respuesta = self.client.delete(self.url(self.modelo))

        self.assertEqual(respuesta.status_code, 403)
        self.assertEqual(list(producto.categorias.all()), [self.modelo])

    def test_las_demas_categorias_siguen_siendo_editables_y_borrables(self):
        respuesta = self.client.patch(self.url(self.otra), {'nombre': 'BanG Dream!'})
        self.assertEqual(respuesta.status_code, 200)
        self.assertFalse(respuesta.data['protegida'])

        self.assertEqual(self.client.delete(self.url(self.otra)).status_code, 204)

    def test_otra_categoria_no_puede_tomar_el_nombre_de_una_principal(self):
        respuesta = self.client.patch(self.url(self.otra), {'nombre': 'Modelo'})
        self.assertEqual(respuesta.status_code, 400)


class FavoritosTests(APITestCase):
    """Favoritos: lista personal, idempotente, solo para quien ve el catálogo
    desbloqueado, y que ignora los productos desactivados sin perderlos."""

    URL = '/api/v1/products/favoritos/'
    URL_IDS = '/api/v1/products/favoritos/ids/'

    def setUp(self):
        Usuario = get_user_model()
        self.cliente = Usuario.objects.create_user(
            username='cliente', email='cliente@test.com', password='x', estado_suscripcion='ACTIVO',
        )
        self.otro = Usuario.objects.create_user(
            username='otro', email='otro@test.com', password='x', estado_suscripcion='ACTIVO',
        )
        self.modelo = Categoria.objects.get(nombre='Modelo')
        self.aoi = crear_producto('Aoi', categorias=[self.modelo])
        self.miku = crear_producto('Miku', categorias=[self.modelo])
        self.client.force_authenticate(self.cliente)

    def url(self, producto):
        return f'{self.URL}{producto.id}/'

    def titulos(self):
        return [p['titulo'] for p in self.client.get(self.URL).data['results']]

    def test_marcar_y_listar_del_mas_reciente_al_mas_antiguo(self):
        self.assertEqual(self.client.put(self.url(self.aoi)).status_code, 204)
        self.assertEqual(self.client.put(self.url(self.miku)).status_code, 204)

        respuesta = self.client.get(self.URL)

        self.assertEqual(respuesta.data['count'], 2)
        self.assertEqual([p['titulo'] for p in respuesta.data['results']], ['Miku', 'Aoi'])
        # Misma forma que el catálogo: la tarjeta de producto se reutiliza tal cual.
        self.assertIn('categorias_detalle', respuesta.data['results'][0])
        self.assertEqual(sorted(self.client.get(self.URL_IDS).data), sorted([self.aoi.id, self.miku.id]))

    def test_marcar_dos_veces_no_duplica(self):
        self.client.put(self.url(self.aoi))
        self.assertEqual(self.client.put(self.url(self.aoi)).status_code, 204)

        self.assertEqual(Favorito.objects.filter(usuario=self.cliente, producto=self.aoi).count(), 1)
        self.assertEqual(self.titulos(), ['Aoi'])

    def test_desmarcar_y_desmarcar_lo_que_no_estaba(self):
        self.client.put(self.url(self.aoi))

        self.assertEqual(self.client.delete(self.url(self.aoi)).status_code, 204)
        self.assertEqual(self.client.delete(self.url(self.aoi)).status_code, 204)

        self.assertEqual(self.titulos(), [])
        self.assertEqual(self.client.get(self.URL_IDS).data, [])

    def test_cada_usuario_solo_ve_y_toca_los_suyos(self):
        self.client.put(self.url(self.aoi))

        self.client.force_authenticate(self.otro)
        self.assertEqual(self.titulos(), [])
        self.assertEqual(self.client.get(self.URL_IDS).data, [])
        # Desmarcar desde otra cuenta no afecta al favorito del primero.
        self.client.delete(self.url(self.aoi))

        self.client.force_authenticate(self.cliente)
        self.assertEqual(self.titulos(), ['Aoi'])

    def test_no_se_puede_marcar_un_producto_inexistente_o_inactivo(self):
        inactivo = crear_producto('Inactivo', categorias=[self.modelo], activo=False)

        self.assertEqual(self.client.put(f'{self.URL}999999/').status_code, 404)
        self.assertEqual(self.client.put(self.url(inactivo)).status_code, 404)
        self.assertFalse(Favorito.objects.exists())

    def test_producto_desactivado_se_oculta_y_vuelve_al_reactivarlo(self):
        self.client.put(self.url(self.aoi))
        self.client.put(self.url(self.miku))

        Producto.objects.filter(pk=self.aoi.pk).update(activo=False)
        self.assertEqual(self.titulos(), ['Miku'])
        self.assertEqual(self.client.get(self.URL_IDS).data, [self.miku.id])

        Producto.objects.filter(pk=self.aoi.pk).update(activo=True)
        self.assertEqual(self.titulos(), ['Miku', 'Aoi'])

    def test_borrar_el_producto_lo_quita_de_favoritos_sin_bloquear_el_borrado(self):
        self.client.put(self.url(self.aoi))

        self.aoi.delete()

        self.assertFalse(Favorito.objects.exists())
        self.assertEqual(self.titulos(), [])

    def test_solo_cuentas_con_acceso_al_catalogo(self):
        Usuario = get_user_model()
        pendiente = Usuario.objects.create_user(
            username='pendiente', email='pendiente@test.com', password='x', estado_suscripcion='PENDIENTE_PAGO',
        )
        staff = Usuario.objects.create_user(username='staff', email='staff@test.com', password='x', is_staff=True)
        peticiones = (
            lambda: self.client.get(self.URL),
            lambda: self.client.get(self.URL_IDS),
            lambda: self.client.put(self.url(self.aoi)),
            lambda: self.client.delete(self.url(self.aoi)),
        )

        self.client.force_authenticate(None)
        for peticion in peticiones:
            self.assertEqual(peticion().status_code, 401)

        self.client.force_authenticate(pendiente)
        for peticion in peticiones:
            self.assertEqual(peticion().status_code, 403)
        self.assertFalse(Favorito.objects.exists())

        # El staff no tiene suscripción, pero sí acceso al catálogo.
        self.client.force_authenticate(staff)
        self.assertEqual(self.client.put(self.url(self.aoi)).status_code, 204)
        self.assertEqual(self.titulos(), ['Aoi'])

    def test_el_listado_no_hace_una_consulta_por_producto(self):
        for i in range(10):
            self.client.put(self.url(crear_producto(f'P{i}', categorias=[self.modelo])))

        # count + productos + categorías prefetcheadas.
        with self.assertNumQueries(3):
            self.client.get(self.URL)
