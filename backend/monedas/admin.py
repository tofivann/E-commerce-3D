from django.contrib import admin

from .models import Monedero, MovimientoMonedas


class SoloLecturaAdmin(admin.ModelAdmin):
    """En el panel de Django los MimiCoins se consultan, no se editan.

    El saldo solo puede cambiar por monedas/services.py, que actualiza el
    monedero y anota el movimiento juntos: editar una fila a mano aquí los
    dejaría sin cuadrar (un saldo sin su movimiento, o al revés). Para sumar o
    quitar MimiCoins a alguien está el ajuste del panel del sitio
    (Ajustes > Usuarios), que sí deja registro.
    """

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Monedero)
class MonederoAdmin(SoloLecturaAdmin):
    list_display = ('usuario', 'saldo')
    search_fields = ('usuario__email', 'usuario__nombre', 'usuario__username')
    ordering = ('-saldo',)
    list_select_related = ('usuario',)


@admin.register(MovimientoMonedas)
class MovimientoMonedasAdmin(SoloLecturaAdmin):
    list_display = ('fecha', 'usuario', 'cantidad', 'tipo', 'saldo_resultante', 'orden', 'nota', 'creado_por')
    list_filter = ('tipo', 'fecha')
    search_fields = ('usuario__email', 'usuario__nombre', 'orden__codigo_orden', 'nota')
    date_hierarchy = 'fecha'
    list_select_related = ('usuario', 'orden', 'creado_por')
