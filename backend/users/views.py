from rest_framework import viewsets, permissions
from .models import Usuario
from .serializers import UsuarioSerializer

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    
    # En desarrollo puedes dejar IsAuthenticated.
    # Si vas a permitir registro público mediante POST, usa permissions.AllowAny o crea un endpoint de registro dedicado.
    permission_classes = [permissions.IsAuthenticated]
