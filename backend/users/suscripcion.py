"""Precio de la suscripción (el pago único que activa una cuenta).

Único lugar donde se define: de aquí lo leen los cuatro cobros (registro y
activación de cuenta, por Stripe y por PayPal) y el endpoint público que lo
muestra en el formulario de registro, para que lo que se anuncia y lo que se
cobra no puedan diferir. Para cambiar el precio se edita solo esta constante.
"""
from decimal import Decimal

PRECIO_SUSCRIPCION = Decimal('5.00')
MONEDA_SUSCRIPCION = 'USD'


def precio_suscripcion_en_centavos():
    """El precio como lo pide Stripe (`unit_amount`): entero, en centavos."""
    return int(PRECIO_SUSCRIPCION * 100)
