from django.contrib import admin
from .models import TramoPersonajesMotion, JuegoComision, ComisionMotion, ComisionModelo


@admin.register(TramoPersonajesMotion)
class TramoPersonajesMotionAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'min_personajes', 'max_personajes', 'precio', 'activo', 'orden_visualizacion')
    list_editable = ('precio', 'activo', 'orden_visualizacion')


@admin.register(JuegoComision)
class JuegoComisionAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'precio', 'activo')
    list_editable = ('precio', 'activo')
    search_fields = ('nombre',)


@admin.register(ComisionMotion)
class ComisionMotionAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'orden', 'tramo_personajes', 'nombre_juego', 'nombre_cancion', 'estado')
    list_filter = ('estado', 'tramo_personajes')
    search_fields = ('usuario__nombre', 'nombre_juego', 'nombre_cancion', 'orden__codigo_orden')
    list_editable = ('estado',)


@admin.register(ComisionModelo)
class ComisionModeloAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'orden', 'juego', 'nombre_personaje', 'estado', 'producto_publicado')
    list_filter = ('estado', 'juego')
    search_fields = ('usuario__nombre', 'nombre_personaje', 'orden__codigo_orden')
    list_editable = ('estado',)
