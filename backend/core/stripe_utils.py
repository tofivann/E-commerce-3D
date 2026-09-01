def stripe_dict_get(obj, key, default=None):
    """
    Acceso tipo diccionario seguro para objetos de Stripe.

    Nota: el SDK instalado (stripe-python v15.5.1) bloquea .get() a propósito
    en sus StripeObject ("no es un dict real"), pero sí soporta 'in' y [].
    Usar esto en vez de obj.get(key, default) para leer eventos/sesiones de
    Stripe, sean StripeObject o dict planos (ej. en tests).
    """
    if obj is None:
        return default
    return obj[key] if key in obj else default
