import os
from decimal import Decimal

from rest_framework import serializers

from .models import Categoria, Producto


class CategoriaSerializer(serializers.ModelSerializer):
    # Solo lectura: le dice al panel qué filas mostrar bloqueadas. El bloqueo
    # real está en CategoriaViewSet.
    protegida = serializers.BooleanField(read_only=True)

    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'nombre_en', 'activo', 'protegida']


class ProductoSerializer(serializers.ModelSerializer):
    categorias = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.filter(activo=True), many=True, allow_empty=False,
    )
    categorias_detalle = CategoriaSerializer(source='categorias', many=True, read_only=True)
    archivo_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = [
            'id',
            'titulo',
            'descripcion',
            'acepta_dinero',
            'acepta_monedas',
            'precio',
            'precio_monedas',
            'categorias',
            'categorias_detalle',
            'formato_archivo',
            'archivo_3d',
            'archivo_nombre',
            'imagen_previa',
            'imagen_miniatura',
            'link_youtube',
            'activo',
            'fecha_creacion'
        ]
        read_only_fields = ['fecha_creacion', 'imagen_miniatura']
        # El archivo que se vende solo ENTRA (al crear/editar el producto):
        # su dirección no se devuelve a nadie, ni en el catálogo ni anidado
        # en el carrito, las órdenes o la biblioteca. Se descarga solo por
        # las vistas que comprueban la compra (o que es admin).
        extra_kwargs = {'archivo_3d': {'write_only': True}}

    def validate(self, datos):
        """Cada forma de pago marcada exige su precio: dinero, un precio en $;
        MimiCoins, un precio en MimiCoins. Hay que marcar al menos una. Un
        producto solo-MimiCoins no cobra dinero: su precio en $ queda en 0.
        Se mira el valor nuevo o, en un PATCH que no lo manda, el guardado."""
        instancia = self.instance

        def valor(campo, por_defecto=None):
            if campo in datos:
                return datos[campo]
            return getattr(instancia, campo, por_defecto) if instancia else por_defecto

        acepta_dinero = valor('acepta_dinero', True)
        acepta_monedas = valor('acepta_monedas', False)
        errores = {}
        if not acepta_dinero and not acepta_monedas:
            errores['acepta_dinero'] = 'Marca al menos una forma de pago.'
        if acepta_monedas and not valor('precio_monedas'):
            errores['precio_monedas'] = 'Un producto que se paga con MimiCoins necesita un precio en MimiCoins.'
        if acepta_dinero and valor('precio') is None:
            errores['precio'] = 'Un producto que se paga con dinero necesita un precio.'
        if errores:
            raise serializers.ValidationError(errores)
        if not acepta_dinero:
            datos['precio'] = Decimal('0')
        return datos

    def get_archivo_nombre(self, producto):
        """Nombre del archivo cargado, solo para el admin (para saber qué
        tiene subido antes de reemplazarlo). Para el resto, nada."""
        request = self.context.get('request')
        if not (request and request.user.is_authenticated and request.user.is_staff):
            return None
        return os.path.basename(producto.archivo_3d.name) if producto.archivo_3d else None