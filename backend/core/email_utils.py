import requests
from django.conf import settings
from django.template.loader import render_to_string


def enviar_email(to, subject, template_name, context):
    """
    Envía un correo transaccional vía la API REST de Resend, renderizando un
    template Django (APP_DIRS=True, así que cada app define los suyos en su
    propio templates/<app>/*.html).

    Nunca propaga la excepción: un fallo de correo (red, API key inválida,
    etc.) no debe tumbar el webhook de Stripe que lo dispara ni afectar el
    estado que ya se guardó en la base de datos — mismo criterio que el
    resto de los `services.py` de la plataforma. Por eso se llama directo a
    la API REST (con timeout corto) en vez del SDK `resend`: el SDK no deja
    configurar un timeout, y una llamada colgada aquí puede tumbar TODA la
    transacción atómica que la dispara (incluida la que ya activó la cuenta
    o marcó la orden pagada), ya que si el worker muere a mitad de una
    conexión colgada, Postgres revierte lo que todavía no se había
    confirmado — aunque el `save()` ya se hubiera ejecutado en Python.
    """
    try:
        html = render_to_string(template_name, context)
        requests.post(
            'https://api.resend.com/emails',
            headers={'Authorization': f'Bearer {settings.RESEND_API_KEY}'},
            json={
                'from': settings.EMAIL_FROM,
                'to': [to],
                'subject': subject,
                'html': html,
            },
            timeout=8,
        )
    except Exception as e:
        print(f"Error enviando email a {to}: {e}")
