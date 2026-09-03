from rest_framework import serializers

from orders.models import Orden
from .models import TramoPersonajesMotion, JuegoComision, ComisionMotion, ComisionModelo


class TramoPersonajesMotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TramoPersonajesMotion
        fields = ['id', 'nombre', 'min_personajes', 'max_personajes', 'precio', 'activo', 'orden_visualizacion']


class JuegoComisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = JuegoComision
        fields = ['id', 'nombre', 'precio', 'activo']


class OrdenResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Orden
        fields = ['id', 'codigo_orden', 'total', 'estado_pago', 'fecha_orden']
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Solicitud (input) — el view arma Orden + Comisión a partir de esto,
# siguiendo el mismo patrón que RegistroView/CheckoutView (orquestación en
# la vista, no en el serializer).
# ---------------------------------------------------------------------------

class SolicitudComisionMotionSerializer(serializers.Serializer):
    tramo_personajes = serializers.PrimaryKeyRelatedField(
        queryset=TramoPersonajesMotion.objects.filter(activo=True)
    )
    nombre_juego = serializers.CharField(max_length=150)
    nombre_cancion = serializers.CharField(max_length=150)
    link_video = serializers.URLField(max_length=500)
    informacion_adicional = serializers.CharField(required=False, allow_blank=True, default='')


class SolicitudComisionModeloSerializer(serializers.Serializer):
    juego = serializers.PrimaryKeyRelatedField(queryset=JuegoComision.objects.filter(activo=True))
    nombre_personaje = serializers.CharField(max_length=150)
    foto_referencia_1 = serializers.ImageField()
    foto_referencia_2 = serializers.ImageField(required=False)


# ---------------------------------------------------------------------------
# Lectura (cliente) — de solo lectura, incluye la orden anidada y el link de
# descarga (solo presente cuando ya se subió el archivo de entrega).
# ---------------------------------------------------------------------------

class ComisionMotionSerializer(serializers.ModelSerializer):
    orden = OrdenResumenSerializer(read_only=True)
    tramo_personajes = TramoPersonajesMotionSerializer(read_only=True)
    descarga_url = serializers.SerializerMethodField()

    class Meta:
        model = ComisionMotion
        fields = [
            'id', 'orden', 'tramo_personajes', 'nombre_juego', 'nombre_cancion',
            'link_video', 'informacion_adicional', 'estado', 'descarga_url',
        ]
        read_only_fields = fields

    def get_descarga_url(self, obj):
        if not obj.archivo_entrega:
            return None
        request = self.context.get('request')
        path = f'/api/v1/custom-orders/comisiones/motion/{obj.id}/descargar/'
        return request.build_absolute_uri(path) if request else path


class ComisionModeloSerializer(serializers.ModelSerializer):
    orden = OrdenResumenSerializer(read_only=True)
    juego = JuegoComisionSerializer(read_only=True)
    descarga_url = serializers.SerializerMethodField()

    class Meta:
        model = ComisionModelo
        fields = [
            'id', 'orden', 'juego', 'nombre_personaje', 'foto_referencia_1', 'foto_referencia_2',
            'estado', 'producto_publicado', 'descarga_url',
        ]
        read_only_fields = fields

    def get_descarga_url(self, obj):
        if not obj.archivo_entrega:
            return None
        request = self.context.get('request')
        path = f'/api/v1/custom-orders/comisiones/modelo/{obj.id}/descargar/'
        return request.build_absolute_uri(path) if request else path


# ---------------------------------------------------------------------------
# Admin — puede cambiar estado y subir el archivo de entrega.
# ---------------------------------------------------------------------------

class ComisionMotionAdminSerializer(serializers.ModelSerializer):
    orden = OrdenResumenSerializer(read_only=True)
    tramo_personajes = TramoPersonajesMotionSerializer(read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True)
    usuario_email = serializers.EmailField(source='usuario.email', read_only=True)

    class Meta:
        model = ComisionMotion
        fields = [
            'id', 'orden', 'usuario_nombre', 'usuario_email', 'tramo_personajes', 'nombre_juego',
            'nombre_cancion', 'link_video', 'informacion_adicional', 'estado', 'archivo_entrega',
        ]
        read_only_fields = [
            'id', 'orden', 'usuario_nombre', 'usuario_email', 'tramo_personajes', 'nombre_juego',
            'nombre_cancion', 'link_video', 'informacion_adicional',
        ]


class ComisionModeloAdminSerializer(serializers.ModelSerializer):
    orden = OrdenResumenSerializer(read_only=True)
    juego = JuegoComisionSerializer(read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True)
    usuario_email = serializers.EmailField(source='usuario.email', read_only=True)

    class Meta:
        model = ComisionModelo
        fields = [
            'id', 'orden', 'usuario_nombre', 'usuario_email', 'juego', 'nombre_personaje',
            'foto_referencia_1', 'foto_referencia_2', 'estado', 'archivo_entrega', 'producto_publicado',
        ]
        read_only_fields = [
            'id', 'orden', 'usuario_nombre', 'usuario_email', 'juego', 'nombre_personaje',
            'foto_referencia_1', 'foto_referencia_2', 'producto_publicado',
        ]


class PublicarProductoSerializer(serializers.Serializer):
    """Datos que el admin completa para publicar el Producto derivado de una ComisionModelo."""
    titulo = serializers.CharField(max_length=200)
    descripcion = serializers.CharField()
    precio = serializers.DecimalField(max_digits=10, decimal_places=2)
    formato_archivo = serializers.CharField(max_length=50)
    imagen_previa = serializers.ImageField(required=False)
