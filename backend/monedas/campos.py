"""Campos compartidos por todo lo que se vende: el "precio en monedas"
(productos, tramos de Motion, juegos de Modelo y los datos de reventa de una
comisión) y el "modo de pago" de un producto. Definidos una vez para que la
regla no se pueda desalinear."""
from django.core.validators import MinValueValidator
from django.db import models

from .reglas import PRECIO_EN_MONEDAS_POR_DEFECTO


# Con qué se compra un producto: una casilla por forma de pago, que el admin
# marca en cualquier combinación (al menos una). Una forma de pago nueva es
# una casilla más, no combinaciones nuevas. Deciden qué precio aplica y en
# qué tienda aparece el producto: la normal muestra los que aceptan dinero y
# la "Tienda MimiCoins" los que aceptan MimiCoins (uno puede estar en las dos).


def campo_acepta_dinero():
    return models.BooleanField(
        default=True, db_index=True,
        help_text="Se puede comprar con dinero (carrito, Stripe o PayPal). Exige un precio en $.",
    )


def campo_acepta_monedas():
    return models.BooleanField(
        default=False, db_index=True,
        help_text="Se puede pagar con MimiCoins. Exige un precio en MimiCoins.",
    )


def campo_precio_en_monedas():
    return models.PositiveIntegerField(
        null=True,
        blank=True,
        default=PRECIO_EN_MONEDAS_POR_DEFECTO,
        validators=[MinValueValidator(1)],
        help_text="Precio en monedas. Vacío = no se puede pagar con monedas.",
    )
