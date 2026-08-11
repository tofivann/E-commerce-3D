from datetime import timedelta

# Configuración centralizada de Simple JWT para la API
SIMPLE_JWT = {
    # Tiempos de vida del token
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    
    # Rotación de tokens al refrescar sesión
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,

    # Algoritmo de firma
    'ALGORITHM': 'HS256',

    # Configuración del encabezado en peticiones HTTP ("Authorization: Bearer <token>")
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    
    # Mapeo del ID de usuario
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}