from django.contrib import admin
from products.models import Producto

@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'precio', 'formato_archivo', 'activo', 'fecha_creacion')
    list_filter = ('activo', 'formato_archivo', 'fecha_creacion')
    search_fields = ('titulo', 'descripcion')
    list_editable = ('precio', 'activo')