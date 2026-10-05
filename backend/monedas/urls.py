from django.urls import path

from .views import AjustarMonedasAdminView, MisMovimientosView

urlpatterns = [
    path('movimientos/', MisMovimientosView.as_view(), name='mis-movimientos-monedas'),
    path('admin/ajustes/', AjustarMonedasAdminView.as_view(), name='ajustar-monedas'),
]
