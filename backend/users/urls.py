from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import UsuarioViewSet, CustomTokenObtainPairView, RegistroView, RegistroPayPalView, ActivarCuentaPagoView, ActivarCuentaPagoPayPalView, VerificarPagoUsuarioView, GoogleLoginView, SolicitarResetPasswordView, ConfirmarResetPasswordView

router = DefaultRouter()
router.register(r'users', UsuarioViewSet, basename='user')

urlpatterns = [
    # 1. Rutas de Autenticación con JWT (POST)
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    #ruta del registro
    path('auth/register/', RegistroView.as_view(), name='token_register'),
    path('auth/register-paypal/', RegistroPayPalView.as_view(), name='token_register_paypal'),
    # 2. Rutas automáticas CRUD de Usuarios (/users/, /users/1/, etc.)
    path('', include(router.urls)),

    path('activar-cuenta-pago/', ActivarCuentaPagoView.as_view(), name='activar-cuenta-pago'),
    path('activar-cuenta-pago-paypal/', ActivarCuentaPagoPayPalView.as_view(), name='activar-cuenta-pago-paypal'),
    path('verificar-pago/', VerificarPagoUsuarioView.as_view(), name='verificar-pago-usuario'),

    # NUEVA RUTA PARA EL LOGIN CON GOOGLE
    path('auth/google/', GoogleLoginView.as_view(), name='google-login'),

    path('auth/solicitar-password/', SolicitarResetPasswordView.as_view(), name='solicitar-password'),
    path('auth/confirmar-password/', ConfirmarResetPasswordView.as_view(), name='confirmar-password'),
]
