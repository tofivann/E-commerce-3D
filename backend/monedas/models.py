from django.conf import settings
from django.db import models


class Monedero(models.Model):
    """El saldo de monedas de un usuario.

    Vive en su propia tabla, y no como un campo más de `Usuario`, a propósito:
    muchas partes del sitio guardan al usuario entero (perfil, login, panel
    admin) y cualquiera de ellas habría podido pisar el saldo con un valor
    viejo si una compra se confirmaba a la vez. Esta fila solo la toca
    monedas/services.py, siempre bloqueada (`select_for_update`).

    El saldo es la suma de los `MovimientoMonedas` del usuario, guardada para
    leerla sin sumar. Nunca se cambia por otro camino.
    """
    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='monedero')
    saldo = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Monedero"
        verbose_name_plural = "Monederos"

    def __str__(self):
        return f"{self.usuario} — {self.saldo} monedas"


class MovimientoMonedas(models.Model):
    """Cada vez que el saldo de un usuario sube o baja, con su motivo. Es el
    historial que ve el usuario en su perfil y lo que permite auditar un saldo."""

    class Tipo(models.TextChoices):
        GANADA = 'GANADA', 'Ganadas por una compra'
        PAGO = 'PAGO', 'Pago con monedas'
        DEVOLUCION = 'DEVOLUCION', 'Devolución de un pago con monedas'
        RETIRO = 'RETIRO', 'Retiro de monedas ganadas (compra cancelada)'
        AJUSTE = 'AJUSTE', 'Ajuste manual del administrador'

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='movimientos_monedas')
    cantidad = models.IntegerField(help_text="Positivo si suma al saldo, negativo si resta.")
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    orden = models.ForeignKey(
        'orders.Orden', null=True, blank=True, on_delete=models.SET_NULL, related_name='movimientos_monedas',
        help_text="Orden que originó el movimiento (vacío en los ajustes manuales).",
    )
    saldo_resultante = models.PositiveIntegerField(help_text="Saldo del usuario justo después de este movimiento.")
    nota = models.CharField(max_length=200, blank=True, help_text="Motivo escrito por el admin en un ajuste manual.")
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+',
        help_text="Admin que hizo el ajuste manual.",
    )
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Movimiento de monedas"
        verbose_name_plural = "Movimientos de monedas"
        ordering = ['-fecha', '-id']
        constraints = [
            # Una orden produce como mucho un movimiento de cada tipo. Es lo
            # que impide sumar dos veces cuando la pasarela avisa dos veces
            # del mismo pago, aunque fallara la comprobación previa.
            models.UniqueConstraint(
                fields=['orden', 'tipo'], condition=models.Q(orden__isnull=False),
                name='uniq_movimiento_monedas_orden_tipo',
            ),
        ]

    def __str__(self):
        return f"{self.usuario} {self.cantidad:+d} ({self.get_tipo_display()})"
