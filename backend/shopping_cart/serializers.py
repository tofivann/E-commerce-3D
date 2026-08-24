from decimal import Decimal

from rest_framework import serializers
from products.serializers import ProductoSerializer
from .models import Carrito, CarritoItem

TASA_IMPUESTO = Decimal('0.08')  # 8%, igual que en el mockup del carrito


class CarritoItemSerializer(serializers.ModelSerializer):
    producto = ProductoSerializer(read_only=True)

    class Meta:
        model = CarritoItem
        fields = ['id', 'producto']


class CarritoSerializer(serializers.ModelSerializer):
    items = CarritoItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    impuestos = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()

    class Meta:
        model = Carrito
        fields = ['id', 'items', 'subtotal', 'impuestos', 'total', 'fecha_actualizacion']

    def get_subtotal(self, obj):
        return sum((item.producto.precio for item in obj.items.all()), Decimal('0.00'))

    def get_impuestos(self, obj):
        return (self.get_subtotal(obj) * TASA_IMPUESTO).quantize(Decimal('0.01'))

    def get_total(self, obj):
        return self.get_subtotal(obj) + self.get_impuestos(obj)
