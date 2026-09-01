#chat serializers
from rest_framework import serializers
from .models import Conversacion, Mensaje
from users.serializers import UsuarioSerializer

class MensajeSerializer(serializers.ModelSerializer):
    remitente_nombre = serializers.CharField(source='remitente.nombre', read_only=True)
    remitente_es_admin = serializers.SerializerMethodField()

    class Meta:
        model = Mensaje
        fields = ['id', 'conversacion', 'remitente', 'remitente_nombre', 'remitente_es_admin', 'contenido', 'fecha_envio']
        read_only_fields = ['remitente', 'fecha_envio', 'conversacion']

    def get_remitente_es_admin(self, obj):
        if not obj.remitente:
            return False
        return obj.remitente.is_staff or obj.remitente.is_superuser


class ConversacionSerializer(serializers.ModelSerializer):
    usuario_info = UsuarioSerializer(source='usuario', read_only=True)
    ultimo_mensaje = serializers.SerializerMethodField()
    mensajes_no_leidos = serializers.SerializerMethodField()

    class Meta:
        model = Conversacion
        fields = [
            'id', 
            'usuario', 
            'usuario_info', 
            'fecha_creacion', 
            'fecha_ultima_actividad', 
            'ultimo_mensaje',
            'mensajes_no_leidos'
        ]
        read_only_fields = ['usuario', 'fecha_creacion', 'fecha_ultima_actividad']

    def _mensajes_precargados(self, obj):
        # ConversacionViewSet.get_queryset precarga esto vía Prefetch (to_attr=
        # 'mensajes_recientes') para evitar 2 queries extra por conversación.
        # Si el serializer se usa fuera de ese queryset (ej. al crear una
        # conversación nueva), caemos a una consulta normal.
        mensajes = getattr(obj, 'mensajes_recientes', None)
        if mensajes is None:
            mensajes = list(obj.mensajes.order_by('-fecha_envio'))
        return mensajes

    def get_ultimo_mensaje(self, obj):
        mensajes = self._mensajes_precargados(obj)
        ultimo = mensajes[0] if mensajes else None
        if ultimo:
            return {
                "contenido": ultimo.contenido,
                "fecha": ultimo.fecha_envio,
                "remitente": ultimo.remitente.nombre if ultimo.remitente else "Desconocido"
            }
        return None

    def get_mensajes_no_leidos(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0

        if request.user.is_staff or request.user.is_superuser:
            ultimo_leido = obj.admin_ultimo_leido
        else:
            ultimo_leido = obj.cliente_ultimo_leido

        mensajes = [m for m in self._mensajes_precargados(obj) if m.remitente_id != request.user.id]

        if ultimo_leido:
            return sum(1 for m in mensajes if m.fecha_envio > ultimo_leido)

        return len(mensajes)

    