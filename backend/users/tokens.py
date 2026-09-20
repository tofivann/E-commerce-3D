from datetime import timedelta

from rest_framework_simplejwt.tokens import RefreshToken

# Duración del refresh token cuando NO se marca "Mantener sesión abierta" —
# comparado con REFRESH_TOKEN_LIFETIME (7 días, en core/jwt_settings.py) que
# aplica cuando sí se marca. En ambos casos es tiempo de INACTIVIDAD, no
# absoluto: cada renovación en /auth/refresh/ emite un refresh nuevo con la
# duración completa (sesión deslizante).
DURACION_SESION_CORTA = timedelta(days=1)

# Claim propio dentro del refresh token. Hace falta porque con
# ROTATE_REFRESH_TOKENS cada renovación reemplaza el token, y sin guardar la
# preferencia dentro del propio token el nuevo volvería a los 7 días default.
CLAIM_REMEMBER_ME = 'remember_me'


def crear_refresh_token(usuario, remember_me):
    """Único punto donde se emite un refresh token de sesión (login por
    contraseña y login con Google pasan por acá), para que ambos respeten
    "Mantener sesión abierta" de la misma forma."""
    refresh = RefreshToken.for_user(usuario)
    refresh[CLAIM_REMEMBER_ME] = bool(remember_me)
    if not remember_me:
        refresh.set_exp(lifetime=DURACION_SESION_CORTA)
    return refresh


def datos_usuario_para_login(usuario):
    """Bloque `user` que el frontend guarda en localStorage tras iniciar sesión."""
    return {
        'id': usuario.id,
        'username': usuario.username,
        'email': usuario.email,
        'first_name': getattr(usuario, 'first_name', ''),
        'last_name': getattr(usuario, 'last_name', ''),
        'is_staff': usuario.is_staff,
        'rol': usuario.rol,
        'estado_suscripcion': usuario.estado_suscripcion,
    }


def respuesta_login(usuario, remember_me):
    """Cuerpo completo de una respuesta de login: tokens + datos del usuario."""
    refresh = crear_refresh_token(usuario, remember_me)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': datos_usuario_para_login(usuario),
    }
