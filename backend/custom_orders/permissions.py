from rest_framework import permissions


class EsAdminOSoloLectura(permissions.BasePermission):
    """
    Cualquier usuario autenticado puede leer (necesitan ver las tablas de
    precio para armar el formulario de comisión), pero solo el staff puede
    crear/editar/eliminar juegos o tramos de precio.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_staff or request.user.is_superuser
