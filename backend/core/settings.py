"""
Django settings for core project.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url  
from .jwt_settings import SIMPLE_JWT

# Cargar variables del archivo .env
BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env')


SECRET_KEY = os.getenv('SECRET_KEY', 'clave_secreta_desarrollo_12345')
DEBUG = os.getenv('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = ['*']  # <-- CORREGIDO: Permite conexiones en desarrollo local

# 1. Modelo de usuario personalizado
AUTH_USER_MODEL = 'users.Usuario'

# 2. Apps instaladas
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
   # Librerías de terceros
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',

    
    # Apps locales
    'users', 
    'products',
    'shopping_cart',
    'orders',
    'custom_orders',
    'chat',
]

# 3. Middleware (CorsMiddleware debe ir arriba de CommonMiddleware)
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

# 4. Configuración de CORS (Frontend Vite)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
# Permite que el frontend lea el nombre de archivo al descargar una compra
# (por defecto los navegadores ocultan este header en peticiones cross-origin).
CORS_EXPOSE_HEADERS = ['Content-Disposition']

# Origen del frontend, usado para construir las URLs de retorno de Stripe Checkout.
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

# Claves de Stripe (modo test). Se definen en el .env local, NUNCA se commitean.
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', '')

# Correos transaccionales vía Resend. Se definen en el .env local, NUNCA se commitean.
RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')
EMAIL_FROM = os.getenv('EMAIL_FROM', 'MimiMMDart <onboarding@resend.dev>')

# 5. Base de datos con Supabase / PostgreSQL
DATABASE_URL = os.getenv('DATABASE_URL')

if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=0,  # El pooler de Supabase ya gestiona las conexiones
            ssl_require=False # Importante: Desactivado para el puerto 6543 del Pooler
        )
    }
else:
    # Fallback local por si el .env falla
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# 6. Configuración de Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
}

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        # 'core' es el paquete del proyecto (no está en INSTALLED_APPS), así
        # que su carpeta templates/ no la descubre APP_DIRS solo — se agrega
        # a mano acá para que email_base.html (base compartida de correos)
        # sea visible desde el template de cualquier app.
        'DIRS': [BASE_DIR / 'core' / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

LANGUAGE_CODE = 'es-es'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 7. Archivos subidos por el usuario (archivo_3d, imagen_previa, etc.)
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    # Cuando se conecte Supabase Storage (compatible con S3), reemplazar 'default' por:
    # 'default': {
    #     'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
    # },
    # (requiere instalar 'django-storages' y 'boto3', y definir las credenciales
    # AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_STORAGE_BUCKET_NAME / AWS_S3_ENDPOINT_URL
    # apuntando al endpoint S3 del proyecto de Supabase).
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
}