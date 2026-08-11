from django.contrib import admin
from users.models import Usuario
from django.contrib.auth.admin import UserAdmin

@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ('email', 'nombre', 'username', 'rol', 'estado_suscripcion', 'is_staff', 'fecha_registro')
    list_filter = ('rol', 'estado_suscripcion', 'is_staff', 'is_active')
    search_fields = ('email', 'nombre', 'username')
    ordering = ('-fecha_registro',)
    
    # Adaptación de fieldsets para incluir los nuevos campos del modelo unificado
    fieldsets = UserAdmin.fieldsets + (
        ('Información de Perfil y Suscripción', {
            'fields': ('nombre', 'rol', 'estado_suscripcion')
        }),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Información Adicional', {
            'fields': ('nombre', 'email', 'rol', 'estado_suscripcion')
        }),
    )