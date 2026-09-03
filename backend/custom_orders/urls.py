from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TramoPersonajesMotionViewSet,
    JuegoComisionViewSet,
    SolicitarComisionMotionView,
    SolicitarComisionModeloView,
    DescargarComisionMotionView,
    DescargarComisionModeloView,
    ComisionMotionAdminViewSet,
    ComisionModeloAdminViewSet,
)

router = DefaultRouter()
router.register(r'tramos-motion', TramoPersonajesMotionViewSet, basename='tramo-motion')
router.register(r'juegos', JuegoComisionViewSet, basename='juego-comision')
router.register(r'admin/comisiones/motion', ComisionMotionAdminViewSet, basename='comision-motion-admin')
router.register(r'admin/comisiones/modelo', ComisionModeloAdminViewSet, basename='comision-modelo-admin')

urlpatterns = [
    path('comisiones/motion/', SolicitarComisionMotionView.as_view(), name='comisiones-motion'),
    path('comisiones/motion/<int:pk>/descargar/', DescargarComisionMotionView.as_view(), name='comision-motion-descargar'),
    path('comisiones/modelo/', SolicitarComisionModeloView.as_view(), name='comisiones-modelo'),
    path('comisiones/modelo/<int:pk>/descargar/', DescargarComisionModeloView.as_view(), name='comision-modelo-descargar'),
    path('', include(router.urls)),
]
