# chat/views.py corregido para seguridad estricta
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Conversacion, Mensaje
from .serializers import ConversacionSerializer, MensajeSerializer
from .permissions import EsAdminOPropietarioConversacion

class ConversacionViewSet(viewsets.ModelViewSet):
    serializer_class = ConversacionSerializer
    permission_classes = [EsAdminOPropietarioConversacion]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Conversacion.objects.none()
        if user.is_staff or user.is_superuser:
            return Conversacion.objects.all().order_by('-fecha_ultima_actividad')
        return Conversacion.objects.filter(usuario=user)

    def perform_create(self, serializer):
        user = self.request.user
        conversacion_existente = Conversacion.objects.filter(usuario=user).first()
        if conversacion_existente:
            self.conversacion_existente = conversacion_existente
            return
        serializer.save(usuario=user)

    def create(self, request, *args, **kwargs):
        self.conversacion_existente = None
        response = super().create(request, *args, **kwargs)
        if getattr(self, 'conversacion_existente', None):
            serializer = self.get_serializer(self.conversacion_existente, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        return response

    @action(detail=True, methods=['get', 'post'])
    def mensajes(self, request, pk=None):
        conversacion = self.get_object()
        
        # CORRECCIÓN DE SEGURIDAD CRÍTICA: Forzar verificación explícita de permisos de objeto
        self.check_object_permissions(request, conversacion)

        if request.method == 'GET':
            ahora = timezone.now()
            if request.user.is_staff or request.user.is_superuser:
                conversacion.admin_ultimo_leido = ahora
                conversacion.save(update_fields=['admin_ultimo_leido'])
            else:
                conversacion.cliente_ultimo_leido = ahora
                conversacion.save(update_fields=['cliente_ultimo_leido'])

            mensajes = conversacion.mensajes.order_by('fecha_envio')
            
            page = self.paginate_queryset(mensajes)
            if page is not None:
                serializer = MensajeSerializer(page, many=True, context={'request': request})
                return self.get_paginated_response(serializer.data)

            serializer = MensajeSerializer(mensajes, many=True, context={'request': request})
            return Response(serializer.data)

        if request.method == 'POST':
            serializer = MensajeSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            
            mensaje = serializer.save(
                conversacion=conversacion,
                remitente=request.user
            )

            conversacion.save(update_fields=['fecha_ultima_actividad'])

            return Response(MensajeSerializer(mensaje, context={'request': request}).data, status=status.HTTP_201_CREATED)