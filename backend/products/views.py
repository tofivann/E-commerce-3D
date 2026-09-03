from rest_framework import viewsets, permissions
from .models import Producto
from .serializers import ProductoSerializer

class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer

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
            quiere_inactivos = self.request.query_params.get('incluir_inactivos') == 'true'
            if user.is_authenticated and user.is_staff and quiere_inactivos:
                return Producto.objects.all()
            return Producto.objects.filter(activo=True)

        # Para operar sobre un producto puntual por su id (ver detalle,
        # editar, cambiar activo/inactivo, eliminar) el admin no debería
        # tener que acordarse de mandar ese mismo parámetro — si ya lo tiene
        # listado en su panel, debe poder gestionarlo sin importar su estado.
        if user.is_authenticated and user.is_staff:
            return Producto.objects.all()
        return Producto.objects.filter(activo=True)