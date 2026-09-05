"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve as serve_static

from .views import StripeWebhookView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Rutas de tus módulos / APIs
    path('api/v1/users/', include('users.urls')),
    path('api/v1/products/', include('products.urls')),
    path('api/v1/cart/', include('shopping_cart.urls')),
    path('api/v1/orders/', include('orders.urls')),
    path('api/v1/chat/', include('chat.urls')),
    path('api/v1/custom-orders/', include('custom_orders.urls')),

    # Punto de entrada único para todos los webhooks de Stripe (ver
    # core/views.py: enruta por metadata['tipo'] a cada app correspondiente).
    path('api/v1/stripe/webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
]

# Sirve los archivos subidos (archivo_3d, imagen_previa, archivo_entrega) tanto en
# desarrollo como en producción — el proyecto usa almacenamiento local (FileSystemStorage)
# en ambos casos, no un bucket S3/Supabase Storage externo. El helper static() de Django
# se auto-desactiva si DEBUG=False, así que se sirve a mano con la vista serve().
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve_static, {'document_root': settings.MEDIA_ROOT}),
]
