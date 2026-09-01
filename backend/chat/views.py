# chat/views.py corregido para seguridad estricta
from django.db.models import Prefetch
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

        # Precarga los mensajes de cada conversación en una sola query extra,
        # para que el serializer no dispare 2 queries más por conversación
        # (último mensaje + no leídos) al listar (ver ConversacionSerializer).
        mensajes_prefetch = Prefetch(
            'mensajes',
            queryset=Mensaje.objects.order_by('-fecha_envio'),
            to_attr='mensajes_recientes',
        )
        base = Conversacion.objects.prefetch_related(mensajes_prefetch)

        if user.is_staff or user.is_superuser:
            return base.order_by('-fecha_ultima_actividad')
        return base.filter(usuario=user)

    def create(self, request, *args, **kwargs):
        # get_or_create es atómico frente a condiciones de carrera gracias al
        # constraint OneToOne en Conversacion.usuario: si dos peticiones casi
        # simultáneas del mismo usuario llegan aquí, la BD garantiza que solo
        # una fila termine creada y la otra reciba esa misma conversación.
        conversacion, creada = Conversacion.objects.get_or_create(usuario=request.user)
        serializer = self.get_serializer(conversacion, context={'request': request})
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if creada else status.HTTP_200_OK,
        )

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