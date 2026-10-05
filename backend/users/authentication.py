from rest_framework_simplejwt.authentication import JWTAuthentication

from core.idiomas import idioma_de_peticion


class JWTAuthenticationConIdioma(JWTAuthentication):
    """La autenticación JWT de siempre, que además recuerda en qué idioma está
    usando el sitio el usuario (`Usuario.idioma`).

    Hace falta guardarlo porque casi todos los correos salen cuando el
    cliente NO está presente: los dispara el webhook de la pasarela de pago,
    el admin al subir una entrega o una tarea programada — peticiones que no
    traen el idioma del cliente. Como el frontend manda su idioma en cada
    petición autenticada, el campo se mantiene solo al día.

    Solo escribe cuando el idioma cambió (una vez por cambio de pestaña
    ES/EN), nunca en cada petición.
    """

    def authenticate(self, request):
        resultado = super().authenticate(request)
        if resultado is not None:
            usuario = resultado[0]
            idioma = idioma_de_peticion(request)
            if idioma and idioma != usuario.idioma:
                # update() y no save(): no pisa otros campos que la vista
                # pueda estar modificando en esta misma petición.
                type(usuario).objects.filter(pk=usuario.pk).update(idioma=idioma)
                usuario.idioma = idioma
        return resultado
