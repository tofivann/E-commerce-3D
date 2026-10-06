from django.urls import path
from .views import (
    MiCarritoView,
    CarritoItemView,
    CheckoutView,
    CheckoutPayPalCrearView,
    CheckoutMonedasView,
    CanjeMonedasView,
    OrdenPorSesionView,
)

urlpatterns = [
    path('mio/', MiCarritoView.as_view(), name='mi-carrito'),
    path('items/', CarritoItemView.as_view(), name='carrito-agregar-item'),
    path('items/<int:item_id>/', CarritoItemView.as_view(), name='carrito-eliminar-item'),
    path('checkout/', CheckoutView.as_view(), name='carrito-checkout'),
    path('checkout-paypal/', CheckoutPayPalCrearView.as_view(), name='carrito-checkout-paypal'),
    path('checkout-monedas/', CheckoutMonedasView.as_view(), name='carrito-checkout-monedas'),
    path('canjear-monedas/', CanjeMonedasView.as_view(), name='canjear-monedas'),
    path('orden/<str:session_id>/', OrdenPorSesionView.as_view(), name='orden-por-sesion'),
]
