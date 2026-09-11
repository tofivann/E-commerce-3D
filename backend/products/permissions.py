from rest_framework import permissions


class EsAdminOSoloLectura(permissions.BasePermission):
    """Cualquiera puede leer categorías; solo el staff puede crear/editar/eliminarlas."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)
