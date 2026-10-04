from rest_framework import permissions


class EsAdminOSoloLectura(permissions.BasePermission):
    """Cualquiera puede leer categorías; solo el staff puede crear/editar/eliminarlas."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class TieneAccesoAlCatalogo(permissions.BasePermission):
    """Solo cuentas que ven el catálogo desbloqueado (staff o suscripción
    activa). Un invitado o una cuenta sin pagar ve las tarjetas tapadas, así
    que no tiene nada que guardar en favoritos."""
    message = 'Necesitas una suscripción activa para usar favoritos.'

    def has_permission(self, request, view):
        usuario = request.user
        return bool(usuario and usuario.is_authenticated and usuario.tiene_acceso_al_catalogo)
