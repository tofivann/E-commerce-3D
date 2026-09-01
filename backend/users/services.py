from django.db import transaction

from core.stripe_utils import stripe_dict_get
from .models import Usuario


@transaction.atomic
def activar_suscripcion_usuario(session_data):
    """
    Activa la suscripción del usuario asociado a una sesión de Stripe
    (registro nuevo o activación de cuenta pendiente), cuando Stripe
    confirma el pago (checkout.session.completed). Idempotente.
    """
    metadata = stripe_dict_get(session_data, 'metadata', {})
    user_id = stripe_dict_get(metadata, 'user_id') or stripe_dict_get(session_data, 'client_reference_id')

    if not user_id:
        print("Webhook recibido sin user_id/client_reference_id")
        return

    try:
        usuario = Usuario.objects.select_for_update().get(pk=user_id)
    except Usuario.DoesNotExist:
        print(f"Usuario con ID {user_id} no encontrado en la base de datos.")
        return

    if usuario.estado_suscripcion == Usuario.EstadoSuscripcion.ACTIVO:
        return  # Idempotencia: Stripe puede reenviar el mismo evento varias veces.

    usuario.estado_suscripcion = Usuario.EstadoSuscripcion.ACTIVO
    usuario.save(update_fields=['estado_suscripcion'])
    print(f"¡Suscripción activada con éxito para el usuario ID: {user_id}!")
