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
        # Para usuarios normales solo muestra productos activos.
        # Si es un administrador, muestra absolutamente todos los productos.
        user = self.request.user
        if user.is_staff: #is_staff, is_superuser son propiedades de el usuario de django para indicar si son admin u superuser.
            return Producto.objects.all()
        return Producto.objects.filter(activo=True)