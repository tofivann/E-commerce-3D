from rest_framework import serializers
from .models import Producto

class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = [
            'id', 
            'titulo', 
            'descripcion', 
            'precio', 
            'formato_archivo', 
            'archivo_3d',
            'imagen_previa',
            'link_youtube',
            'activo',
            'fecha_creacion'
        ]
        read_only_fields = ['fecha_creacion']