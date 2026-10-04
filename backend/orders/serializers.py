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


class VentaSerializer(serializers.ModelSerializer):
    """Fila de la sección "Estadísticas y pagos" del admin: una Orden pagada
    (compra del catálogo o comisión). Ver orders/ventas.py.

    Espera el queryset de VentasAdminView, que ya trae al usuario, la
    comisión y los detalles precargados — aquí no se dispara ninguna consulta.
    """
    cliente_nombre = serializers.CharField(source='usuario.nombre', read_only=True)
    cliente_email = serializers.EmailField(source='usuario.email', read_only=True)
    conceptos = serializers.SerializerMethodField()
    estado_comision = serializers.SerializerMethodField()

    class Meta:
        model = Orden
        fields = [
            'id', 'codigo_orden', 'fecha_orden', 'total', 'tipo_orden', 'pasarela_pago',
            'cliente_nombre', 'cliente_email', 'conceptos', 'estado_comision',
        ]
        read_only_fields = fields

    def _comision(self, orden):
        # Relaciones inversas OneToOne: hasattr no consulta porque vienen en
        # el select_related del queryset.
        for relacion in ('comision_motion', 'comision_modelo'):
            if hasattr(orden, relacion):
                return getattr(orden, relacion)
        return None

    def get_conceptos(self, orden):
        """Qué se vendió, como lista de textos. En una compra del catálogo,
        un título por producto (None si el producto se eliminó después: el
        frontend pone el texto traducido). En una comisión, su detalle."""
        if self._comision(orden) is not None:
            # Import local: custom_orders.services importa orders.models.
            from custom_orders.services import datos_comision_para_email
            return [datos_comision_para_email(orden)[1]]
        return [
            detalle.producto.titulo if detalle.producto else None
            for detalle in orden.detalles.all()
        ]

    def get_estado_comision(self, orden):
        comision = self._comision(orden)
        return comision.estado if comision else None
