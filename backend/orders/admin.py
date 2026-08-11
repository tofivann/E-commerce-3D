from django.contrib import admin
from .models import Orden, DetalleOrden, ComprasDigitales


class DetalleOrdenInline(admin.TabularInline):
    model = DetalleOrden
    extra = 0
    readonly_fields = ('precio_unitario',)


@admin.register(Orden)
class OrdenAdmin(admin.ModelAdmin):
    list_display = ('codigo_orden', 'usuario', 'total', 'estado_pago', 'tipo_orden', 'fecha_orden')
    list_filter = ('estado_pago', 'tipo_orden', 'fecha_orden')
    search_fields = ('codigo_orden', 'usuario__nombre', 'usuario__email')
    list_editable = ('estado_pago',)
    readonly_fields = ('fecha_orden',)
    inlines = [DetalleOrdenInline]


@admin.register(DetalleOrden)
class DetalleOrdenAdmin(admin.ModelAdmin):
    list_display = ('orden', 'producto', 'precio_unitario')
    search_fields = ('orden__codigo_orden', 'producto__titulo')
    list_filter = ('orden__estado_pago',)


@admin.register(ComprasDigitales)
class ComprasDigitalesAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'producto', 'orden', 'activo', 'fecha_adquisicion')
    list_filter = ('activo', 'fecha_adquisicion')
    search_fields = (
        'usuario__nombre',
        'usuario__email',
        'producto__titulo',
        'orden__codigo_orden',
    )
    list_editable = ('activo',)
    readonly_fields = ('fecha_adquisicion',)