from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConversacionViewSet

router = DefaultRouter()
router.register(r'conversaciones', ConversacionViewSet, basename='conversacion')

urlpatterns = [
    path('', include(router.urls)),
]