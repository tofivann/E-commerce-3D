from django.urls import path
from .views import DescargarCompraView, MiBibliotecaView, VentasAdminView, VentasResumenAdminView

urlpatterns = [
    path('biblioteca/', MiBibliotecaView.as_view(), name='mi-biblioteca'),
    path('biblioteca/<int:pk>/descargar/', DescargarCompraView.as_view(), name='descargar-compra'),
    # Sección "Estadísticas y pagos" del panel admin.
    path('admin/ventas/', VentasAdminView.as_view(), name='admin-ventas'),
    path('admin/ventas/resumen/', VentasResumenAdminView.as_view(), name='admin-ventas-resumen'),
]
