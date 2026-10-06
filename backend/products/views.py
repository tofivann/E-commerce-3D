import os

from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import PaginacionEstandar
from .filters import BusquedaNormalizadaFilter, CategoriasFilter, TiendaFilter
from .models import Categoria, Favorito, Producto
from .permissions import EsAdminOSoloLectura, TieneAccesoAlCatalogo
from .serializers import CategoriaSerializer, ProductoSerializer


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [EsAdminOSoloLectura]

    # Las categorías principales (Modelo, Motion, Juego) no se editan ni se
    # borran, ni siquiera por staff: ver NOMBRES_CATEGORIAS_PROTEGIDAS.
    def _rechazar_si_protegida(self, categoria):
        if categoria.protegida:
            raise PermissionDenied(
                f'La categoría "{categoria.nombre}" es una categoría principal y no se puede editar ni eliminar.'
            )

    def perform_update(self, serializer):
        self._rechazar_si_protegida(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._rechazar_si_protegida(instance)
        instance.delete()


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    # Listado paginado (?page=, ?page_size=) y filtrado en el servidor
    # (?search=, ?categorias=): el catálogo puede crecer a cientos de
    # productos, así que el frontend los carga por páginas con scroll
    # infinito, y por eso buscar/filtrar en el navegador ya no sirve — solo
    # vería la parte cargada.
    pagination_class = PaginacionEstandar
    filter_backends = [BusquedaNormalizadaFilter, CategoriasFilter, TiendaFilter]
    search_fields = ['titulo_normalizado', 'descripcion_normalizada']

    def get_permissions(self):
        # Permite que cualquiera (incluso no autenticados) vea productos con GET.
        # Solo administradores pueden crear, editar o eliminar productos (POST, PUT, DELETE).
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]

    @action(detail=True, methods=['get'])
    def descargar(self, request, pk=None):
        """Archivo 3D de un producto, para el admin (get_permissions lo
        limita a staff: no es ni `list` ni `retrieve`). El comprador descarga
        por orders.DescargarCompraView, que comprueba su compra."""
        archivo = self.get_object().archivo_3d
        if not archivo:
            raise Http404('El producto no tiene un archivo 3D asociado.')
        return FileResponse(archivo.open('rb'), as_attachment=True, filename=os.path.basename(archivo.name))

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


# ---------------------------------------------------------------------------
# Favoritos: productos que el usuario guardó con el corazón. Cada usuario
# solo ve y modifica los suyos (todo se filtra por request.user). Un producto
# desactivado no aparece en ningún listado, pero el favorito se conserva: si
# el admin lo reactiva, vuelve a la lista de quien lo había guardado.
# ---------------------------------------------------------------------------

def _productos_favoritos(usuario):
    return Producto.objects.filter(activo=True, favoritos__usuario=usuario)


class FavoritosView(generics.ListAPIView):
    """Productos favoritos del usuario, del más reciente al más antiguo,
    paginados igual que el catálogo (página "Favoritos")."""
    serializer_class = ProductoSerializer
    permission_classes = [TieneAccesoAlCatalogo]
    pagination_class = PaginacionEstandar

    def get_queryset(self):
        return (
            _productos_favoritos(self.request.user)
            # Un usuario tiene como mucho un Favorito por producto (constraint
            # único), así que el join no duplica filas.
            .order_by('-favoritos__fecha_creacion', '-id')
            .prefetch_related('categorias')
        )


class FavoritosIdsView(APIView):
    """Solo los ids de los favoritos del usuario: es lo que necesita el
    catálogo para pintar el corazón de cada tarjeta, sin traer los productos."""
    permission_classes = [TieneAccesoAlCatalogo]

    def get(self, request):
        return Response(list(_productos_favoritos(request.user).values_list('id', flat=True)))


class FavoritoView(APIView):
    """Marcar (PUT) o desmarcar (DELETE) un producto como favorito. Ambas
    operaciones son idempotentes: repetirlas deja el mismo resultado y no da
    error, así un doble clic o un reintento no rompen nada."""
    permission_classes = [TieneAccesoAlCatalogo]

    def put(self, request, producto_id):
        producto = get_object_or_404(Producto, pk=producto_id, activo=True)
        Favorito.objects.get_or_create(usuario=request.user, producto=producto)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, producto_id):
        Favorito.objects.filter(usuario=request.user, producto_id=producto_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
