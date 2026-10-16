from rest_framework import serializers

from custom_orders.serializers import URLConEsquemaField
from users.models import Usuario

from .models import Comentario, FotoPublicacion, Publicacion

# Cuántas fotos admite una publicación en total.
MAX_FOTOS = 10


class AutorSerializer(serializers.ModelSerializer):
    """Lo mínimo de un usuario para firmar un comentario (nada de correo ni rol)."""

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'nombre', 'foto_perfil']
        read_only_fields = fields


class FotoPublicacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FotoPublicacion
        fields = ['id', 'imagen', 'imagen_miniatura', 'orden']
        read_only_fields = fields


class PublicacionSerializer(serializers.ModelSerializer):
    link_youtube = URLConEsquemaField(required=False, allow_blank=True)
    fotos = FotoPublicacionSerializer(many=True, read_only=True)
    # Viene anotado por el viewset (Count); si no, se calcula.
    total_comentarios = serializers.SerializerMethodField()

    class Meta:
        model = Publicacion
        fields = [
            'id', 'titulo', 'texto', 'link_youtube', 'publicado',
            'fecha_creacion', 'fecha_actualizacion', 'fotos', 'total_comentarios',
        ]
        read_only_fields = ['fecha_creacion', 'fecha_actualizacion']

    def get_total_comentarios(self, publicacion):
        anotado = getattr(publicacion, 'total_comentarios', None)
        return anotado if anotado is not None else publicacion.comentarios.count()


class ComentarioSerializer(serializers.ModelSerializer):
    usuario = AutorSerializer(read_only=True)
    # El que lo escribió o el staff pueden borrarlo: así el frontend sabe si
    # mostrar el botón sin repetir la regla.
    puede_borrar = serializers.SerializerMethodField()

    class Meta:
        model = Comentario
        fields = ['id', 'usuario', 'texto', 'fecha_creacion', 'puede_borrar']
        read_only_fields = ['fecha_creacion']

    def validate_texto(self, texto):
        texto = texto.strip()
        if not texto:
            raise serializers.ValidationError('Escribe algo antes de enviar.')
        return texto

    def get_puede_borrar(self, comentario):
        request = self.context.get('request')
        usuario = getattr(request, 'user', None)
        if not usuario or not usuario.is_authenticated:
            return False
        return usuario.is_staff or comentario.usuario_id == usuario.id
