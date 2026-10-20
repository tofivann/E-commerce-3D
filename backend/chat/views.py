# chat/views.py corregido para seguridad estricta
from django.db.models import Count, F, Prefetch, Q
from django.utils import timezone
from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Conversacion, Mensaje
from .serializers import ConversacionSerializer, MensajeSerializer
from .permissions import EsAdminOPropietarioConversacion


class NoLeidosView(APIView):
    """Total de mensajes sin leer para quien pregunta, para el globo del menú
    (admin: "Conversaciones", en todas las conversaciones; cliente: "Chat con
    Mimi", en la suya). Se consulta cada poco, así que es una sola consulta.
    "Sin leer" = mensajes de la otra parte posteriores a la última lectura
    (o todos, si nunca se abrió la conversación), el mismo criterio que
    ConversacionSerializer.mensajes_no_leidos.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        usuario = request.user
        if usuario.is_staff or usuario.is_superuser:
            conversaciones = Conversacion.objects.all()
            campo_leido = 'admin_ultimo_leido'
        else:
            conversaciones = Conversacion.objects.filter(usuario=usuario)
            campo_leido = 'cliente_ultimo_leido'
        nuevos = Q(mensajes__fecha_envio__gt=F(campo_leido)) | Q(**{f'{campo_leido}__isnull': True})
        pendientes = list(
            conversaciones
            .annotate(pendientes=Count('mensajes', filter=~Q(mensajes__remitente=usuario) & nuevos))
            .filter(pendientes__gt=0)
            .values_list('pendientes', flat=True)
        )
        return Response({'mensajes': sum(pendientes), 'conversaciones': len(pendientes)})

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