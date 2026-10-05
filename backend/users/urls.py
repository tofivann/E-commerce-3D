from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UsuarioViewSet, CustomTokenObtainPairView, CustomTokenRefreshView, LogoutView, RegistroView, RegistroPayPalView, SolicitarCodigoRegistroView, VerificarCodigoRegistroView, PrecioSuscripcionView, ActivarCuentaPagoView, ActivarCuentaPagoPayPalView, VerificarPagoUsuarioView, GoogleLoginView, SolicitarResetPasswordView, ConfirmarResetPasswordView, MiPerfilView, MiFotoPerfilView

router = DefaultRouter()
router.register(r'users', UsuarioViewSet, basename='user')

urlpatterns = [
    # 1. Rutas de Autenticación con JWT (POST)
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='token_logout'),
    #ruta del registro
    # Registro en 3 pasos: código al correo → comprobarlo → crear cuenta y pagar
    path('auth/register/codigo/', SolicitarCodigoRegistroView.as_view(), name='registro-codigo'),
    path('auth/register/verificar-codigo/', VerificarCodigoRegistroView.as_view(), name='registro-verificar-codigo'),
    path('auth/register/', RegistroView.as_view(), name='token_register'),
    path('auth/register-paypal/', RegistroPayPalView.as_view(), name='token_register_paypal'),
    # Perfil del propio usuario (nombre y foto)
    path('me/', MiPerfilView.as_view(), name='mi-perfil'),
    path('me/foto/', MiFotoPerfilView.as_view(), name='mi-foto-perfil'),
    # 2. Rutas automáticas CRUD de Usuarios (/users/, /users/1/, etc.)
    path('', include(router.urls)),

    path('activar-cuenta-pago/', ActivarCuentaPagoView.as_view(), name='activar-cuenta-pago'),
    path('activar-cuenta-pago-paypal/', ActivarCuentaPagoPayPalView.as_view(), name='activar-cuenta-pago-paypal'),
    path('suscripcion/precio/', PrecioSuscripcionView.as_view(), name='precio-suscripcion'),
    path('verificar-pago/', VerificarPagoUsuarioView.as_view(), name='verificar-pago-usuario'),

    # NUEVA RUTA PARA EL LOGIN CON GOOGLE
    path('auth/google/', GoogleLoginView.as_view(), name='google-login'),

    path('auth/solicitar-password/', SolicitarResetPasswordView.as_view(), name='solicitar-password'),
    path('auth/confirmar-password/', ConfirmarResetPasswordView.as_view(), name='confirmar-password'),
]
