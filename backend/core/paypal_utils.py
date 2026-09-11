import requests
from django.conf import settings


class PayPalError(Exception):
    """Envuelve cualquier fallo al hablar con la API de PayPal (red, credenciales,
    respuesta no-2xx) con un mensaje legible — mismo rol que stripe.StripeError."""


def _revisar_respuesta(resp):
    try:
        resp.raise_for_status()
    except requests.HTTPError as e:
        detalle = resp.text
        raise PayPalError(f"PayPal respondió {resp.status_code}: {detalle}") from e
    return resp.json()


def _obtener_access_token():
    try:
        resp = requests.post(
            f"{settings.PAYPAL_API_BASE}/v1/oauth2/token",
            auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET),
            data={'grant_type': 'client_credentials'},
            timeout=10,
        )
    except requests.RequestException as e:
        raise PayPalError(f"No se pudo conectar con PayPal: {e}") from e
    return _revisar_respuesta(resp)['access_token']


def crear_orden(total, descripcion, custom_id):
    """
    Crea una orden de PayPal (intent=CAPTURE) por `total` USD. `custom_id` es
    el equivalente al metadata de Stripe — va y vuelve tal cual en la captura,
    así que ahí codificamos {'tipo': ..., 'orden_id'/'user_id': ...} como JSON
    (tope de 127 caracteres impuesto por PayPal).
    """
    token = _obtener_access_token()
    try:
        resp = requests.post(
            f"{settings.PAYPAL_API_BASE}/v2/checkout/orders",
            headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
            json={
                'intent': 'CAPTURE',
                'purchase_units': [{
                    'amount': {'currency_code': 'USD', 'value': f'{total:.2f}'},
                    'description': descripcion[:127],
                    'custom_id': custom_id[:127],
                }],
            },
            timeout=10,
        )
    except requests.RequestException as e:
        raise PayPalError(f"No se pudo conectar con PayPal: {e}") from e
    return _revisar_respuesta(resp)


def consultar_orden(paypal_order_id):
    """
    Consulta el estado actual de una orden de PayPal (GET, sin efectos
    secundarios — a diferencia de capturar_orden, esto no cobra nada). Se usa
    para decidir con certeza si una Orden nuestra que quedó PENDIENTE
    realmente nunca se pagó antes de cancelarla (ver
    orders/management/commands/cancelar_ordenes_paypal_expiradas.py):
    si PayPal dice COMPLETED, la captura sí ocurrió y nuestro sistema
    simplemente no se enteró (nunca hay que cancelar un pago real).
    """
    token = _obtener_access_token()
    try:
        resp = requests.get(
            f"{settings.PAYPAL_API_BASE}/v2/checkout/orders/{paypal_order_id}",
            headers={'Authorization': f'Bearer {token}'},
            timeout=10,
        )
    except requests.RequestException as e:
        raise PayPalError(f"No se pudo conectar con PayPal: {e}") from e
    return _revisar_respuesta(resp)


def capturar_orden(paypal_order_id):
    token = _obtener_access_token()
    try:
        resp = requests.post(
            f"{settings.PAYPAL_API_BASE}/v2/checkout/orders/{paypal_order_id}/capture",
            headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
            timeout=10,
        )
    except requests.RequestException as e:
        raise PayPalError(f"No se pudo conectar con PayPal: {e}") from e
    return _revisar_respuesta(resp)
