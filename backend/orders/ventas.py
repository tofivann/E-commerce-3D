"""Ventas para la sección "Estadísticas y pagos" del panel admin.

Una venta es una Orden pagada: una compra del catálogo o una comisión. Aquí
vive, en un solo sitio, qué cuenta como venta y qué entra en cada filtro; la
lista paginada y el resumen de totales (orders/views.py) usan estas mismas
definiciones, así que la suma que se muestra en un filtro siempre coincide
con las filas que lista.

El importe de una venta es Orden.total: lo cobrado al cliente. Hoy no hay
impuesto (TASA_IMPUESTO = 0), así que cobrado e ingreso son lo mismo; si se
activa, habrá que guardar el impuesto en la Orden y desglosarlo aquí. La
comisión que retienen Stripe/PayPal no se conoce y no se descuenta.
"""
from django.db.models import Count, Q, Sum

from custom_orders.models import EstadoComision
from .models import Orden


def _comision_en_estado(estado):
    # Una Orden de comisión tiene exactamente una de las dos relaciones
    # inversas (OneToOne); una compra del catálogo, ninguna.
    return Q(comision_motion__estado=estado) | Q(comision_modelo__estado=estado)


# Clave que viaja en ?filtro= → condición sobre las ventas. El orden es el
# que muestra la pantalla.
FILTROS = {
    'todas': Q(),
    'comisiones': Q(tipo_orden__in=[Orden.TipoOrden.COMISION_MOTION, Orden.TipoOrden.COMISION_MODELO]),
    'tienda': Q(tipo_orden=Orden.TipoOrden.CATALOGO),
    'en_proceso': _comision_en_estado(EstadoComision.EN_PROCESO),
    'completadas': _comision_en_estado(EstadoComision.COMPLETADO),
}


def ventas(desde=None, hasta=None):
    """Todas las ventas, opcionalmente dentro de [desde, hasta).

    Solo cuenta lo pagado (estado_pago COMPLETADO: fuera pendientes,
    abandonadas y reembolsadas) y nunca una comisión cancelada, aunque su
    Orden figure como pagada. La fecha es la de la Orden (cuando el cliente
    inició la compra); `desde`/`hasta` son instantes con zona horaria.
    """
    queryset = (
        Orden.objects
        .filter(estado_pago=Orden.EstadoPago.COMPLETADO)
        .exclude(_comision_en_estado(EstadoComision.CANCELADO))
    )
    if desde is not None:
        queryset = queryset.filter(fecha_orden__gte=desde)
    if hasta is not None:
        queryset = queryset.filter(fecha_orden__lt=hasta)
    return queryset


def ventas_de_filtro(filtro, desde=None, hasta=None):
    return ventas(desde, hasta).filter(FILTROS[filtro])


def resumen_de_ventas(desde=None, hasta=None):
    """{filtro: {'total': Decimal, 'cantidad': int}} para todos los filtros,
    en una sola consulta (agregados condicionales)."""
    agregados = {}
    for clave, condicion in FILTROS.items():
        # Q() vacío no filtra nada: se pasa None para agregar sobre todo.
        agregados[f'{clave}__total'] = Sum('total', filter=condicion or None)
        agregados[f'{clave}__cantidad'] = Count('id', filter=condicion or None)
    fila = ventas(desde, hasta).aggregate(**agregados)
    return {
        clave: {
            'total': fila[f'{clave}__total'] or 0,
            'cantidad': fila[f'{clave}__cantidad'],
        }
        for clave in FILTROS
    }
