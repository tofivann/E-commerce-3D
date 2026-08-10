from django.contrib import admin
from shopping_cart.models import *

class CarritoItemInline(admin.TabularInline):
    model = CarritoItem
    extra = 1


@admin.register(Carrito)
class CarritoAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'fecha_actualizacion')
    search_fields = ('usuario__nombre', 'usuario__email')
    readonly_fields = ('fecha_actualizacion',)
    inlines = [CarritoItemInline]


@admin.register(CarritoItem)
class CarritoItemAdmin(admin.ModelAdmin):
    list_display = ('carrito', 'producto')
    search_fields = ('carrito__usuario__nombre', 'producto__titulo')
    list_filter = ('producto',)


# Register your models here.
