import os

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

    def get_archivo_nombre(self, producto):
        """Nombre del archivo cargado, solo para el admin (para saber qué
        tiene subido antes de reemplazarlo). Para el resto, nada."""
        request = self.context.get('request')
        if not (request and request.user.is_authenticated and request.user.is_staff):
            return None
        return os.path.basename(producto.archivo_3d.name) if producto.archivo_3d else None