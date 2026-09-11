from rest_framework import serializers
from .models import Categoria, Producto


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'nombre_en', 'activo']


class ProductoSerializer(serializers.ModelSerializer):
    categoria = serializers.PrimaryKeyRelatedField(queryset=Categoria.objects.filter(activo=True))
    categoria_detalle = CategoriaSerializer(source='categoria', read_only=True)

    class Meta:
        model = Producto
        fields = [
            'id',
            'titulo',
            'descripcion',
            'precio',
            'categoria',
            'categoria_detalle',
            'formato_archivo',
            'archivo_3d',
            'imagen_previa',
            'link_youtube',
            'activo',
            'fecha_creacion'
        ]
        read_only_fields = ['fecha_creacion']