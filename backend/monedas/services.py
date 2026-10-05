"""Todo lo que cambia el saldo de monedas de un usuario pasa por aquí.

`registrar_movimiento` es la única función que escribe el saldo; las demás
son las reglas del negocio (monedas/reglas.py) puestas sobre ella:

  - otorgar_por_orden_pagada(orden)    al confirmarse un pago con dinero
  - cobrar_orden(orden)                al pagar una orden con monedas
  - revertir_por_comision_cancelada(orden)
  - ajustar_saldo(usuario, ...)        ajuste manual del admin

Todas son idempotentes por orden (una orden produce como mucho un movimiento
de cada tipo) y están pensadas para llamarse DENTRO de la transacción que
hace el cambio que las origina: o se guarda todo, o nada.
"""
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction

from .models import Monedero, MovimientoMonedas
from .reglas import MONEDAS_POR_COMPRA, PASARELA_MONEDAS

Tipo = MovimientoMonedas.Tipo


class SaldoInsuficiente(Exception):
    """El usuario no tiene monedas suficientes para lo que se le quiere cobrar."""

    def __init__(self, saldo, necesarias):
        super().__init__(f'Saldo insuficiente: tiene {saldo} monedas y hacen falta {necesarias}.')
        self.saldo = saldo
        self.necesarias = necesarias


def saldo_de(usuario):
    """Monedas que tiene el usuario (0 si todavía no tiene monedero). No
    consulta si el monedero ya viene cargado (`select_related('monedero')`)."""
    try:
        return usuario.monedero.saldo
    except ObjectDoesNotExist:
        return 0


@transaction.atomic
def registrar_movimiento(usuario, cantidad, tipo, orden=None, nota='', creado_por=None, recortar=False):
    """Suma (o resta, si `cantidad` es negativa) monedas al saldo de
    `usuario` y lo deja anotado. Devuelve el movimiento creado, o None si no
    había nada que hacer (cantidad 0, o esa orden ya tenía un movimiento de
    ese tipo: una repetición).

    El saldo nunca queda negativo: si la resta no cabe se lanza
    `SaldoInsuficiente`, salvo con `recortar=True`, que resta solo hasta
    dejar el saldo en 0 (para quitar monedas que quizá ya se gastaron).
    """
    if orden is not None and MovimientoMonedas.objects.filter(orden=orden, tipo=tipo).exists():
        return None

    Monedero.objects.get_or_create(usuario=usuario)
    # Bloquea la fila hasta el final de la transacción: dos operaciones a la
    # vez sobre el mismo usuario se hacen una detrás de la otra.
    monedero = Monedero.objects.select_for_update().get(usuario=usuario)

    if monedero.saldo + cantidad < 0:
        if not recortar:
            raise SaldoInsuficiente(monedero.saldo, -cantidad)
        cantidad = -monedero.saldo
    if cantidad == 0:
        return None

    monedero.saldo += cantidad
    monedero.save(update_fields=['saldo'])
    # Si `usuario` ya tenía el monedero cargado, que no se quede con el saldo viejo.
    usuario.monedero = monedero
    return MovimientoMonedas.objects.create(
        usuario=usuario, cantidad=cantidad, tipo=tipo, orden=orden,
        saldo_resultante=monedero.saldo, nota=nota, creado_por=creado_por,
    )


def otorgar_por_orden_pagada(orden):
    """Da las monedas que corresponden a una orden recién pagada con dinero:
    una por cada producto de una compra del catálogo, una por una comisión.
    Una orden pagada con monedas no da monedas."""
    from orders.models import Orden  # import local: orders.models importa monedas.reglas

    if orden.pasarela_pago == PASARELA_MONEDAS:
        return None
    unidades = orden.detalles.count() if orden.tipo_orden == Orden.TipoOrden.CATALOGO else 1
    return registrar_movimiento(orden.usuario, unidades * MONEDAS_POR_COMPRA, Tipo.GANADA, orden=orden)


def cobrar_orden(orden):
    """Descuenta del saldo las monedas de una orden que se paga con monedas
    (`orden.total_monedas`). Lanza `SaldoInsuficiente` si no alcanzan."""
    return registrar_movimiento(orden.usuario, -orden.total_monedas, Tipo.PAGO, orden=orden)


def revertir_por_comision_cancelada(orden):
    """Deshace el efecto en monedas de una comisión que se cancela después
    de pagada:
      - si se pagó con monedas, se le devuelven enteras;
      - si se pagó con dinero, se le quitan las que ganó por ella (solo
        hasta donde llegue su saldo: puede haberlas gastado ya).
    """
    if orden.pasarela_pago == PASARELA_MONEDAS:
        pago = MovimientoMonedas.objects.filter(orden=orden, tipo=Tipo.PAGO).first()
        if pago is None:
            return None
        return registrar_movimiento(orden.usuario, -pago.cantidad, Tipo.DEVOLUCION, orden=orden)

    ganadas = MovimientoMonedas.objects.filter(orden=orden, tipo=Tipo.GANADA).first()
    if ganadas is None:
        return None
    return registrar_movimiento(orden.usuario, -ganadas.cantidad, Tipo.RETIRO, orden=orden, recortar=True)


def ajustar_saldo(usuario, cantidad, nota, creado_por):
    """Ajuste manual del admin (regalo o corrección). `cantidad` puede ser
    negativa; lanza `SaldoInsuficiente` si dejaría el saldo por debajo de 0."""
    return registrar_movimiento(usuario, cantidad, Tipo.AJUSTE, nota=nota, creado_por=creado_por)
