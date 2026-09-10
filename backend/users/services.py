from django.conf import settings
from django.db import transaction

from core.email_utils import enviar_email
from core.stripe_utils import stripe_dict_get
from .models import Usuario


@transaction.atomic
def _marcar_usuario_activo(user_id):
    """
    Solo la parte de base de datos, en su propia transacción corta. Devuelve
    el Usuario recién activado, o None si no existía o ya estaba ACTIVO
    (idempotencia: Stripe/PayPal pueden reintentar el mismo evento).
    """
    try:
        usuario = Usuario.objects.select_for_update().get(pk=user_id)
    except Usuario.DoesNotExist:
        print(f"Usuario con ID {user_id} no encontrado en la base de datos.")
        return None

    if usuario.estado_suscripcion == Usuario.EstadoSuscripcion.ACTIVO:
        return None

    usuario.estado_suscripcion = Usuario.EstadoSuscripcion.ACTIVO
    usuario.save(update_fields=['estado_suscripcion'])
    return usuario


def activar_suscripcion_usuario(session_data):
    """
    Activa la suscripción del usuario asociado a una sesión de Stripe
    (registro nuevo o activación de cuenta pendiente), cuando Stripe
    confirma el pago (checkout.session.completed). Idempotente.

    El guardado en base de datos y el envío del correo están deliberadamente
    separados en dos pasos (no en una sola @transaction.atomic): el correo
    puede tardar o fallar (ver core/email_utils.py) y NUNCA debe poder tumbar
    ni revertir el cambio de estado, que ya debe quedar confirmado en la base
    de datos antes de siquiera intentar mandarlo.
    """
    metadata = stripe_dict_get(session_data, 'metadata', {})
    user_id = stripe_dict_get(metadata, 'user_id') or stripe_dict_get(session_data, 'client_reference_id')

    if not user_id:
        print("Webhook recibido sin user_id/client_reference_id")
        return

    usuario = _marcar_usuario_activo(user_id)
    if usuario is None:
        return

    try:
        print(f"¡Suscripción activada con éxito para el usuario ID: {user_id}!")
    except UnicodeEncodeError:
        print(f"Suscripcion activada con exito para el usuario ID: {user_id}")

    enviar_email(
        to=usuario.email,
        subject="¡Tu cuenta ya está activa! 🎉",
        template_name='users/email_cuenta_activada.html',
        context={'nombre': usuario.nombre, 'frontend_url': settings.FRONTEND_URL},
    )
