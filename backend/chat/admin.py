from django.contrib import admin
from .models import Conversacion, Mensaje


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