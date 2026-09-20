from rest_framework import viewsets, permissions

from core.pagination import PaginacionEstandar
from .filters import BusquedaNormalizadaFilter, CategoriasFilter
from .models import Categoria, Producto
from .permissions import EsAdminOSoloLectura
from .serializers import CategoriaSerializer, ProductoSerializer


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [EsAdminOSoloLectura]


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    # Listado paginado (?page=, ?page_size=) y filtrado en el servidor
    # (?search=, ?categorias=): el catálogo puede crecer a cientos de
    # productos, así que el frontend los carga por páginas con scroll
    # infinito, y por eso buscar/filtrar en el navegador ya no sirve — solo
    # vería la parte cargada.
    pagination_class = PaginacionEstandar
    filter_backends = [BusquedaNormalizadaFilter, CategoriasFilter]
    search_fields = ['titulo_normalizado', 'descripcion_normalizada']

    def get_permissions(self):
        # Permite que cualquiera (incluso no autenticados) vea productos con GET.
        # Solo administradores pueden crear, editar o eliminar productos (POST, PUT, DELETE).
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user

        # El LISTADO (catálogo, público o visto por un admin) siempre muestra
        # solo productos activos por defecto. Los inactivos solo aparecen ahí
        # cuando el panel de administración los pide explícitamente con
        # ?incluir_inactivos=true — así un admin viendo la tienda como
        # cliente ve lo mismo que cualquier otro usuario, en vez de ver
        # siempre todo por ser staff.
        if self.action == 'list':
            # El serializer lee `categorias` dos veces por producto (ids y
            # detalle); sin este prefetch cada lectura es una consulta más,
            # o sea 2 por producto (medido: 103 consultas para 51 productos,
            # 2 con el prefetch).
            qs = Producto.objects.prefetch_related('categorias')
            quiere_inactivos = self.request.query_params.get('incluir_inactivos') == 'true'
            if user.is_authenticated and user.is_staff and quiere_inactivos:
                return qs
            return qs.filter(activo=True)

        # Para operar sobre un producto puntual por su id (ver detalle,
        # editar, cambiar activo/inactivo, eliminar) el admin no debería
        # tener que acordarse de mandar ese mismo parámetro — si ya lo tiene
        # listado en su panel, debe poder gestionarlo sin importar su estado.
        if user.is_authenticated and user.is_staff:
            return Producto.objects.all()
        return Producto.objects.filter(activo=True)