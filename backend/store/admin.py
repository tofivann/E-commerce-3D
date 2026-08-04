from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    Usuario, Administrador, Cliente, Producto, 
    CarritoItem, Orden, DetalleOrden, EncargoPersonalizado, Conversacion
)

admin.site.register(Usuario, UserAdmin)
admin.site.register(Administrador)
admin.site.register(Cliente)
admin.site.register(Producto)
admin.site.register(CarritoItem)
admin.site.register(Orden)
admin.site.register(DetalleOrden)
admin.site.register(EncargoPersonalizado)
admin.site.register(Conversacion)