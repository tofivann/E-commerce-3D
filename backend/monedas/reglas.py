"""Las reglas de las monedas, en un solo sitio.

Las monedas son un premio por comprar: cada producto comprado con dinero, y
cada comisión pagada con dinero, da monedas; y con monedas se puede pagar
entera una compra (nunca una parte: no se mezclan con dinero). Lo que se paga
con monedas no da monedas. La suscripción no participa.

Este módulo no importa modelos a propósito: lo leen products, custom_orders y
orders para sus valores por defecto sin crear dependencias circulares.
"""

# Cómo se llaman las monedas de cara al usuario (mensajes de error del
# backend; los correos y el frontend lo escriben en sus propios textos). En
# el código siguen siendo "monedas".
NOMBRE_MONEDAS = 'MimiCoins'

# Monedas que da cada producto comprado con dinero y cada comisión pagada con dinero.
MONEDAS_POR_COMPRA = 1

# Precio en monedas con que nace un producto, un tramo de Motion o un juego de
# Modelo. El admin lo cambia en cada uno; vacío = no se puede pagar con monedas.
PRECIO_EN_MONEDAS_POR_DEFECTO = 10

# Valor de Orden.pasarela_pago cuando la orden se pagó con monedas.
PASARELA_MONEDAS = 'Monedas'
