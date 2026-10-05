"""Campo "precio en monedas", igual en todo lo que se puede pagar con monedas
(productos, tramos de Motion, juegos de Modelo y los datos de reventa de una
comisión). Definido una vez para que la regla no se pueda desalinear."""
from django.core.validators import MinValueValidator
from django.db import models

from .reglas import PRECIO_EN_MONEDAS_POR_DEFECTO


def campo_precio_en_monedas():
    return models.PositiveIntegerField(
        null=True,
        blank=True,
        default=PRECIO_EN_MONEDAS_POR_DEFECTO,
        validators=[MinValueValidator(1)],
        help_text="Precio en monedas. Vacío = no se puede pagar con monedas.",
    )
