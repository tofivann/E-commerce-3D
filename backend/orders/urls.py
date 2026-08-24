from django.urls import path
from .views import MiBibliotecaView, DescargarCompraView

urlpatterns = [
    path('biblioteca/', MiBibliotecaView.as_view(), name='mi-biblioteca'),
    path('biblioteca/<int:pk>/descargar/', DescargarCompraView.as_view(), name='descargar-compra'),
]
