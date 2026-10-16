from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ComentarioView, ComentariosView, PublicacionViewSet

router = DefaultRouter()
router.register(r'publicaciones', PublicacionViewSet, basename='publicacion')

urlpatterns = [
    path('publicaciones/<int:publicacion_id>/comentarios/', ComentariosView.as_view(), name='publicacion-comentarios'),
    path('comentarios/<int:pk>/', ComentarioView.as_view(), name='comentario'),
    path('', include(router.urls)),
]
