"""Verificación del correo al registrarse, con un código de 6 dígitos.

Antes de crear la cuenta (y de cobrar) se comprueba que quien se registra
recibe correo en la dirección que escribió: un correo mal escrito dejaba una
cuenta pagada que no recibía el recibo ni podía recuperar la contraseña.

Flujo (ver las vistas de registro en users/views.py):
  1. `enviar_codigo(email, idioma)` genera un código y lo manda por correo.
  2. `comprobar_codigo(email, codigo)` lo valida cuando el usuario lo escribe.
  3. El registro vuelve a llamar a `comprobar_codigo` (la pantalla no es una
     garantía: la exigencia es del servidor) y, creada la cuenta,
     `consumir_codigo(email)` lo borra.

Reglas:
  - El código vence a los `VIGENCIA_CODIGO`; una vez verificado se da
    `VIGENCIA_TRAS_VERIFICAR` para terminar el pago.
  - `MAX_INTENTOS` fallos lo invalidan: hay que pedir otro.
  - Entre un envío y el siguiente al mismo correo deben pasar `ESPERA_REENVIO`.
  - Se guarda solo una huella (HMAC con SECRET_KEY) del código, nunca el código.
"""
import math
import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac

from core.email_utils import enviar_email
from core.idiomas import EN, ES, IDIOMA_POR_DEFECTO

from .models import CodigoVerificacionCorreo

LONGITUD_CODIGO = 6
VIGENCIA_CODIGO = timedelta(minutes=15)
VIGENCIA_TRAS_VERIFICAR = timedelta(minutes=30)
ESPERA_REENVIO = timedelta(seconds=60)
MAX_INTENTOS = 5
# Los códigos de quien nunca terminó el registro se borran pasado este tiempo.
RETENCION_CADUCADOS = timedelta(days=1)

MOTIVO_INCORRECTO = 'incorrecto'
MOTIVO_EXPIRADO = 'expirado'
MOTIVO_DEMASIADOS_INTENTOS = 'demasiados_intentos'

MENSAJES = {
    MOTIVO_INCORRECTO: 'El código no es correcto.',
    MOTIVO_EXPIRADO: 'El código venció o no existe. Solicita uno nuevo.',
    MOTIVO_DEMASIADOS_INTENTOS: 'Demasiados intentos fallidos. Solicita un código nuevo.',
}


class CodigoInvalido(Exception):
    """El código no sirve; `motivo` es una de las constantes MOTIVO_*."""

    def __init__(self, motivo):
        super().__init__(MENSAJES[motivo])
        self.motivo = motivo
        self.mensaje = MENSAJES[motivo]


class EsperaReenvio(Exception):
    """Se pidió otro código demasiado pronto; faltan `segundos` para poder."""

    def __init__(self, segundos):
        super().__init__(f'Espera {segundos} segundos para pedir otro código.')
        self.segundos = segundos


def normalizar_correo(email):
    return str(email or '').strip().lower()


def _huella(email, codigo):
    return salted_hmac('users.verificacion', f'{email}:{codigo}', algorithm='sha256').hexdigest()


@transaction.atomic
def _crear_codigo(email):
    """Genera y guarda un código nuevo para `email` (reemplaza al anterior) y
    lo devuelve en claro, que es la única vez que existe así."""
    ahora = timezone.now()
    anterior = CodigoVerificacionCorreo.objects.select_for_update().filter(email=email).first()
    if anterior:
        falta = ESPERA_REENVIO - (ahora - anterior.enviado_en)
        if falta > timedelta(0):
            raise EsperaReenvio(math.ceil(falta.total_seconds()))

    CodigoVerificacionCorreo.objects.filter(expira_en__lt=ahora - RETENCION_CADUCADOS).delete()

    codigo = f'{secrets.randbelow(10 ** LONGITUD_CODIGO):0{LONGITUD_CODIGO}d}'
    CodigoVerificacionCorreo.objects.update_or_create(
        email=email,
        defaults={
            'codigo_hash': _huella(email, codigo),
            'enviado_en': ahora,
            'expira_en': ahora + VIGENCIA_CODIGO,
            'intentos': 0,
            'verificado': False,
        },
    )
    return codigo


def enviar_codigo(email, idioma=None):
    """Manda un código nuevo a `email`. Lanza `EsperaReenvio` si se acaba de
    mandar otro. El correo sale fuera de la transacción que guarda el código
    (mismo criterio que el resto de correos: ver core/email_utils.py)."""
    email = normalizar_correo(email)
    codigo = _crear_codigo(email)
    enviar_email(
        to=email,
        asuntos={
            ES: f'{codigo} es tu código de verificación de MimiMMDart',
            EN: f'{codigo} is your MimiMMDart verification code',
        },
        template_name='users/email_codigo_verificacion.html',
        context={'codigo': codigo, 'minutos': int(VIGENCIA_CODIGO.total_seconds() // 60)},
        idioma=idioma or IDIOMA_POR_DEFECTO,
    )


def comprobar_codigo(email, codigo):
    """Valida el código de `email`; lanza `CodigoInvalido` si no sirve.

    Un fallo cuenta un intento, y ese conteo se confirma en su propia
    transacción ANTES de lanzar la excepción: quien llama no debe envolver
    esta función en un `atomic` que se revierta con el error, o los intentos
    no se contarían y el código se podría adivinar probando.

    Acertar no gasta el código (el registro lo vuelve a comprobar al crear la
    cuenta); lo marca verificado y le da `VIGENCIA_TRAS_VERIFICAR` más.
    """
    email = normalizar_correo(email)
    codigo = str(codigo or '').strip()
    motivo = None
    with transaction.atomic():
        ahora = timezone.now()
        registro = CodigoVerificacionCorreo.objects.select_for_update().filter(email=email).first()
        if registro is None or registro.expira_en <= ahora:
            motivo = MOTIVO_EXPIRADO
        elif registro.intentos >= MAX_INTENTOS:
            motivo = MOTIVO_DEMASIADOS_INTENTOS
        elif not constant_time_compare(registro.codigo_hash, _huella(email, codigo)):
            registro.intentos += 1
            registro.save(update_fields=['intentos'])
            motivo = MOTIVO_DEMASIADOS_INTENTOS if registro.intentos >= MAX_INTENTOS else MOTIVO_INCORRECTO
        elif not registro.verificado:
            registro.verificado = True
            registro.expira_en = ahora + VIGENCIA_TRAS_VERIFICAR
            registro.save(update_fields=['verificado', 'expira_en'])
    if motivo:
        raise CodigoInvalido(motivo)


def consumir_codigo(email):
    """Borra el código de `email`: la cuenta ya se creó y no debe servir otra vez."""
    CodigoVerificacionCorreo.objects.filter(email=normalizar_correo(email)).delete()
