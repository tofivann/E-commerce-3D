from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoriaViewSet, FavoritoView, FavoritosIdsView, FavoritosView, ProductoViewSet

router = DefaultRouter()
router.register(r'products', ProductoViewSet, basename='product')
router.register(r'categorias', CategoriaViewSet, basename='categoria')

urlpatterns = [
    path('favoritos/', FavoritosView.as_view(), name='favoritos'),
    path('favoritos/ids/', FavoritosIdsView.as_view(), name='favoritos-ids'),
    path('favoritos/<int:producto_id>/', FavoritoView.as_view(), name='favorito'),
    path('', include(router.urls)),
]
