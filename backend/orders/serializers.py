from rest_framework import serializers
from products.serializers import ProductoSerializer
from .models import Orden, DetalleOrden, ComprasDigitales


class DetalleOrdenSerializer(serializers.ModelSerializer):
    producto = ProductoSerializer(read_only=True)

    class Meta:
        model = DetalleOrden
        fields = ['id', 'producto', 'precio_unitario']


class ComprasDigitalesSerializer(serializers.ModelSerializer):
    producto = ProductoSerializer(read_only=True)
    codigo_orden = serializers.CharField(source='orden.codigo_orden', read_only=True)
    descarga_url = serializers.SerializerMethodField()

    class Meta:
        model = ComprasDigitales
        fields = [
            'id', 'producto', 'codigo_orden', 'activo',
            'fecha_adquisicion', 'descarga_url',
        ]
        read_only_fields = fields

    def get_descarga_url(self, obj):
        request = self.context.get('request')
        path = f'/api/v1/orders/biblioteca/{obj.id}/descargar/'
        return request.build_absolute_uri(path) if request else path


class OrdenSerializer(serializers.ModelSerializer):
    detalles = DetalleOrdenSerializer(many=True, read_only=True)
    # Solo se llenan una vez que Stripe confirma el pago (ver StripeWebhookView).
    compras_digitales = ComprasDigitalesSerializer(many=True, read_only=True)

    class Meta:
        model = Orden
        fields = [
            'id', 'codigo_orden', 'total', 'estado_pago',
            'tipo_orden', 'pasarela_pago', 'fecha_orden',
            'detalles', 'compras_digitales',
        ]
        read_only_fields = fields
