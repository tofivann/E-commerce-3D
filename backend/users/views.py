from rest_framework import viewsets, permissions
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Usuario
from .serializers import UsuarioSerializer , CustomTokenObtainPairSerializer

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
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    
    def get_permissions(self):
        """
        Permite que CUALQUIERA se registre (POST /api/users/),
        pero exige estar AUTENTICADO para listar, editar o borrar usuarios.
        """
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]