import resend
from django.conf import settings
from django.template.loader import render_to_string

resend.api_key = settings.RESEND_API_KEY


def enviar_email(to, subject, template_name, context):
    """
    Envía un correo transaccional vía Resend, renderizando un template Django
    (APP_DIRS=True, así que cada app define los suyos en su propio
    templates/<app>/*.html).

    Nunca propaga la excepción: un fallo de correo (red, API key inválida,
    etc.) no debe tumbar el webhook de Stripe que lo dispara ni afectar el
    estado que ya se guardó en la base de datos — mismo criterio que el
    resto de los `services.py` de la plataforma.
    """
    try:
        html = render_to_string(template_name, context)
        resend.Emails.send({
            'from': settings.EMAIL_FROM,
            'to': [to],
            'subject': subject,
            'html': html,
        })
    except Exception as e:
        print(f"Error enviando email a {to}: {e}")
