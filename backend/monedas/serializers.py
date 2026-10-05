from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import MovimientoMonedas


class MovimientoMonedasSerializer(serializers.ModelSerializer):
    """Una línea del historial de monedas que ve el usuario en su perfil."""
    codigo_orden = serializers.CharField(source='orden.codigo_orden', read_only=True, default=None)

    class Meta:
        model = MovimientoMonedas
        fields = ['id', 'cantidad', 'tipo', 'saldo_resultante', 'nota', 'codigo_orden', 'fecha']
        read_only_fields = fields


class AjusteMonedasSerializer(serializers.Serializer):
    """Ajuste manual del admin: sumar (cantidad positiva) o quitar (negativa)
    monedas a un usuario, siempre con un motivo que queda en su historial."""
    usuario = serializers.PrimaryKeyRelatedField(queryset=get_user_model().objects.all())
    cantidad = serializers.IntegerField(min_value=-100_000, max_value=100_000)
    nota = serializers.CharField(max_length=200, trim_whitespace=True)

    def validate_cantidad(self, valor):
        if valor == 0:
            raise serializers.ValidationError('La cantidad no puede ser 0.')
        return valor
