from decimal import Decimal

from rest_framework import serializers
from products.serializers import ProductoSerializer
from .models import Carrito, CarritoItem

TASA_IMPUESTO = Decimal('0')  # 0%, sin impuesto por ahora


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
    total_monedas = serializers.SerializerMethodField()

    class Meta:
        model = Carrito
        fields = ['id', 'items', 'subtotal', 'impuestos', 'total', 'total_monedas', 'fecha_actualizacion']

    def get_total_monedas(self, obj):
        """Lo que cuesta el carrito entero pagado con monedas, o None si no
        se puede pagar así (está vacío, o algún producto no tiene precio en
        monedas): no se mezclan monedas y dinero en una misma compra."""
        productos = [item.producto for item in obj.items.all()]
        if not productos or not all(producto.pagable_con_monedas for producto in productos):
            return None
        return sum(producto.precio_monedas for producto in productos)

    def get_subtotal(self, obj):
        return sum((item.producto.precio for item in obj.items.all()), Decimal('0.00'))

    def get_impuestos(self, obj):
        return (self.get_subtotal(obj) * TASA_IMPUESTO).quantize(Decimal('0.01'))

    def get_total(self, obj):
        return self.get_subtotal(obj) + self.get_impuestos(obj)
