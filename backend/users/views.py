from rest_framework import viewsets, permissions
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Usuario
from .serializers import UsuarioSerializer , CustomTokenObtainPairSerializer, RegistroSerializer
from rest_framework import generics

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

# ==========================================
# VISTA DE LOGIN Y GENERACIÓN DE TOKENS (JWT)
# ==========================================
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Vista personalizada para el login. 
    Devuelve los tokens de acceso/refresco + datos del usuario.
    """
    serializer_class = CustomTokenObtainPairSerializer


# ==========================================
# CRUD DE USUARIOS (VIEWSET)
# ==========================================
class UsuarioViewSet(viewsets.ModelViewSet):
    """
    Gestión completa de usuarios (incluye rol y estado de suscripción).
    El registro público de clientes se hace por separado en RegistroView,
    que fija el rol en CLIENTE. Este ViewSet permite elegir el rol libremente,
    por lo que se restringe por completo a administradores.
    """
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

    def get_permissions(self):
        return [permissions.IsAdminUser()]


class RegistroView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegistroSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()

        return Response(
            {
                "mensaje": "¡Registro exitoso! Su cuenta ha sido creada y se encuentra pendiente de verificación de pago de suscripción.",
                "email": usuario.email,
                "estado_suscripcion": usuario.estado_suscripcion
            },
            status=status.HTTP_201_CREATED
        )