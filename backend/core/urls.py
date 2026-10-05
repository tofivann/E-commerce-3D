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
from django.contrib import admin
from django.urls import path, include, re_path

from .media import servir_media
from .views import StripeWebhookView, PayPalCapturarOrdenView, PayPalWebhookView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Rutas de tus módulos / APIs
    path('api/v1/users/', include('users.urls')),
    path('api/v1/products/', include('products.urls')),
    path('api/v1/cart/', include('shopping_cart.urls')),
    path('api/v1/orders/', include('orders.urls')),
    path('api/v1/chat/', include('chat.urls')),
    path('api/v1/custom-orders/', include('custom_orders.urls')),
    path('api/v1/monedas/', include('monedas.urls')),

    # Punto de entrada único para todos los webhooks de Stripe (ver
    # core/views.py: enruta por metadata['tipo'] a cada app correspondiente).
    path('api/v1/stripe/webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),

    # Punto de entrada para capturar órdenes de PayPal (ver core/views.py:
    # PayPalCapturarOrdenView — equivalente al webhook de Stripe de arriba,
    # pero llamado por el frontend en vez de por PayPal).
    path('api/v1/paypal/capturar-orden/', PayPalCapturarOrdenView.as_view(), name='paypal-capturar-orden'),

    # Webhook real de PayPal (ver core/views.py: PayPalWebhookView) — respaldo
    # de la captura activa de arriba, para el caso en que esa captura nunca
    # llegó a completarse en el frontend.
    path('api/v1/paypal/webhook/', PayPalWebhookView.as_view(), name='paypal-webhook'),
]

# Sirve por dirección SOLO las imágenes subidas (ver core/media.py: los
# archivos que se venden o entregan nunca salen por aquí, solo por las vistas
# de descarga que comprueban sesión). Tanto en desarrollo como en producción:
# el proyecto usa almacenamiento local (FileSystemStorage) en ambos casos, y
# el helper static() de Django se auto-desactiva si DEBUG=False.
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', servir_media),
]
