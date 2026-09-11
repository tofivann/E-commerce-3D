from django.contrib import admin, messages
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
    actions = ['forzar_marcar_pagada']

    @admin.action(description="Forzar marcar como PAGADA (otorga acceso/vacía carrito/envía correo, no solo cambia el campo)")
    def forzar_marcar_pagada(self, request, queryset):
        # Import diferido: shopping_cart/custom_orders ya importan de orders,
        # así que importarlos aquí arriba del módulo crearía un ciclo.
        from shopping_cart.services import marcar_orden_pagada
        from custom_orders.services import marcar_comision_pagada

        procesadas, ya_completadas, sin_id_pago = 0, 0, 0
        for orden in queryset:
            if orden.estado_pago == Orden.EstadoPago.COMPLETADO:
                ya_completadas += 1
                continue
            if not orden.stripe_session_id and not orden.paypal_order_id:
                sin_id_pago += 1
                continue

            if orden.tipo_orden == Orden.TipoOrden.CATALOGO:
                marcar_orden_pagada(session_id=orden.stripe_session_id, paypal_order_id=orden.paypal_order_id)
            else:
                marcar_comision_pagada(session_id=orden.stripe_session_id, paypal_order_id=orden.paypal_order_id)
            procesadas += 1

        if procesadas:
            self.message_user(request, f"{procesadas} orden(es) marcadas como pagadas (con acceso y correo).", messages.SUCCESS)
        if ya_completadas:
            self.message_user(request, f"{ya_completadas} orden(es) ya estaban completadas, se omitieron.", messages.INFO)
        if sin_id_pago:
            self.message_user(
                request,
                f"{sin_id_pago} orden(es) no tienen stripe_session_id ni paypal_order_id — no se pudieron procesar.",
                messages.WARNING,
            )


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