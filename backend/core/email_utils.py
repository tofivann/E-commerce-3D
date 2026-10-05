import requests
from django.conf import settings
from django.template.loader import select_template

from core.idiomas import IDIOMA_POR_DEFECTO, normalizar_idioma


def plantillas_para(template_name, idioma):
    """Plantillas candidatas, por orden de preferencia, para un correo en un
    idioma. La versión en español es la plantilla "de siempre"
    (`app/email_x.html`); cada traducción vive al lado con el código de idioma
    antes de la extensión (`app/email_x.en.html`). Si a un correo le falta la
    traducción, se usa la versión en español en vez de no mandarlo.
    """
    if idioma == IDIOMA_POR_DEFECTO:
        return [template_name]
    base, extension = template_name.rsplit('.', 1)
    return [f'{base}.{idioma}.{extension}', template_name]


def enviar_email(to, asuntos, template_name, context, idioma=IDIOMA_POR_DEFECTO):
    """
    Envía un correo transaccional vía la API REST de Resend, renderizando un
    template Django (APP_DIRS=True, así que cada app define los suyos en su
    propio templates/<app>/*.html).

    El correo sale en el idioma del DESTINATARIO: `idioma` es normalmente
    `usuario.idioma` (el que tiene guardado su cuenta), y `asuntos` trae el
    asunto en cada idioma soportado ({ES: ..., EN: ...}). Ver core/idiomas.py.
    La plantilla recibe `idioma` en su contexto.

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
        idioma = normalizar_idioma(idioma) or IDIOMA_POR_DEFECTO
        html = select_template(plantillas_para(template_name, idioma)).render({**context, 'idioma': idioma})
        requests.post(
            'https://api.resend.com/emails',
            headers={'Authorization': f'Bearer {settings.RESEND_API_KEY}'},
            json={
                'from': settings.EMAIL_FROM,
                'to': [to],
                'subject': asuntos.get(idioma) or asuntos[IDIOMA_POR_DEFECTO],
                'html': html,
            },
            timeout=8,
        )
    except Exception as e:
        print(f"Error enviando email a {to}: {e}")
