from django.contrib import admin

from .models import Comentario, FotoPublicacion, Publicacion


class FotoPublicacionInline(admin.TabularInline):
    model = FotoPublicacion
    extra = 0
    fields = ['imagen', 'orden']


@admin.register(Publicacion)
class PublicacionAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'autor', 'publicado', 'fecha_creacion']
    list_filter = ['publicado']
    search_fields = ['titulo', 'texto']
    inlines = [FotoPublicacionInline]


@admin.register(Comentario)
class ComentarioAdmin(admin.ModelAdmin):
    list_display = ['publicacion', 'usuario', 'fecha_creacion']
    search_fields = ['texto', 'usuario__email', 'publicacion__titulo']
