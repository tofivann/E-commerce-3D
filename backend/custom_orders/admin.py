from django.contrib import admin
from .models import EncargoPersonalizado


@admin.register(EncargoPersonalizado)
class EncargoPersonalizadoAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'orden', 'estado_encargo', 'fecha_entrega_estimada')
    list_filter = ('estado_encargo', 'fecha_entrega_estimada')
    search_fields = ('usuario__nombre', 'descripcion_requerimientos', 'orden__codigo_orden')
    list_editable = ('estado_encargo', 'fecha_entrega_estimada')