from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from users.models import Usuario
from products.models import Producto
from shopping_cart.models import *

from .models import (
    Orden,
    DetalleOrden,
    ComprasDigitales,
    EncargoPersonalizado,
    Conversacion,
    Mensaje,
)


# ------------------------------------------------------------------------------
# 4. ÓRDENES Y DETALLES
# ------------------------------------------------------------------------------

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


# ------------------------------------------------------------------------------
# 5. COMPRAS DIGITALES (PERMISOS Y DERECHOS DE DESCARGA)
# ------------------------------------------------------------------------------

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


# ------------------------------------------------------------------------------
# 6. ENCARGOS PERSONALIZADOS
# ------------------------------------------------------------------------------

@admin.register(EncargoPersonalizado)
class EncargoPersonalizadoAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'orden', 'estado_encargo', 'fecha_entrega_estimada')
    list_filter = ('estado_encargo', 'fecha_entrega_estimada')
    search_fields = ('usuario__nombre', 'descripcion_requerimientos', 'orden__codigo_orden')
    list_editable = ('estado_encargo', 'fecha_entrega_estimada')


# ------------------------------------------------------------------------------
# 7. CHAT Y MENSAJERÍA
# ------------------------------------------------------------------------------

class MensajeInline(admin.TabularInline):
    model = Mensaje
    extra = 1
    readonly_fields = ('fecha_envio',)


@admin.register(Conversacion)
class ConversacionAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'fecha_creacion', 'fecha_ultima_actividad')
    search_fields = ('usuario__nombre', 'usuario__email')
    readonly_fields = ('fecha_creacion', 'fecha_ultima_actividad')
    inlines = [MensajeInline]


@admin.register(Mensaje)
class MensajeAdmin(admin.ModelAdmin):
    list_display = ('conversacion', 'remitente', 'fecha_envio')
    search_fields = ('conversacion__id', 'remitente__nombre', 'contenido')
    readonly_fields = ('fecha_envio',)