from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import UsuarioViewSet, CustomTokenObtainPairView ,RegistroView 

router = DefaultRouter()
router.register(r'users', UsuarioViewSet, basename='user')

urlpatterns = [
    # 1. Rutas de Autenticación con JWT (POST)
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    #ruta del registro
    path('auth/register/', RegistroView.as_view(), name='token_register'),
    # 2. Rutas automáticas CRUD de Usuarios (/users/, /users/1/, etc.)
    path('', include(router.urls)),

]