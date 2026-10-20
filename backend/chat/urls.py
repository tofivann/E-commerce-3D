from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConversacionViewSet, NoLeidosView

router = DefaultRouter()
router.register(r'conversaciones', ConversacionViewSet, basename='conversacion')

urlpatterns = [
    path('no-leidos/', NoLeidosView.as_view(), name='chat-no-leidos'),
    path('', include(router.urls)),
]