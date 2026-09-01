#chat/permissions
from rest_framework import permissions

class EsAdminOPropietarioConversacion(permissions.BasePermission):
    """
    Permite acceso total a administradores, o lectura/escritura al propietario de la conversación.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user and (request.user.is_staff or request.user.is_superuser):
            return True
        return obj.usuario == request.user