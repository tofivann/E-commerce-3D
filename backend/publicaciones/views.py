from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, serializers, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from core.pagination import PaginacionEstandar
from products.permissions import EsAdminOSoloLectura, TieneAccesoAlCatalogo

from .models import Comentario, FotoPublicacion, Publicacion
from .serializers import MAX_FOTOS, ComentarioSerializer, PublicacionSerializer


class PaginacionNovedades(PaginacionEstandar):
    """Cada publicación trae fotos y se expande con comentarios: páginas
    cortas, no las 52 del catálogo."""
    page_size = 10


def publicaciones_visibles(usuario, incluir_borradores=False):
    """Las publicadas; el staff puede pedir también los borradores."""
    consulta = Publicacion.objects.all()
    if not (incluir_borradores and usuario.is_authenticated and usuario.is_staff):
        consulta = consulta.filter(publicado=True)
    return consulta


class PublicacionViewSet(viewsets.ModelViewSet):
    """Novedades. Leer: cualquiera (también sin sesión). Escribir: staff.

    Las fotos van en el mismo multipart que el resto de campos: `fotos`
    (varias) para añadir y `fotos_eliminar` (ids) para quitar al editar.
    Una publicación se lista con `?incluir_borradores=true` (solo staff)
    cuando aún no está publicada; por id, el staff siempre la ve.
    """
    serializer_class = PublicacionSerializer
    pagination_class = PaginacionNovedades
    permission_classes = [EsAdminOSoloLectura]

    def get_queryset(self):
        usuario = self.request.user
        # Por id, el staff entra siempre (editar un borrador); en la lista,
        # solo si lo pide, para que el panel y la portada no se confundan.
        ver_borradores = self.action != 'list' or self.request.query_params.get('incluir_borradores') == 'true'
        # order_by explícito: al anotar con Count, Django ignora Meta.ordering
        # y la paginación necesita un orden fijo.
        return (
            publicaciones_visibles(usuario, ver_borradores)
            .annotate(total_comentarios=Count('comentarios'))
            .prefetch_related('fotos')
            .order_by('-fecha_creacion', '-id')
        )

    def _fotos_subidas(self):
        fotos = self.request.FILES.getlist('fotos')
        return fotos

    def _comprobar_cupo(self, publicacion, nuevas, eliminadas=0):
        existentes = publicacion.fotos.count() if publicacion else 0
        if existentes - eliminadas + len(nuevas) > MAX_FOTOS:
            raise serializers.ValidationError({'fotos': f'Como mucho {MAX_FOTOS} fotos por publicación.'})

    def _guardar_fotos(self, publicacion, nuevas):
        siguiente = (publicacion.fotos.order_by('-orden').values_list('orden', flat=True).first() or 0) + 1
        for desplazamiento, imagen in enumerate(nuevas):
            FotoPublicacion.objects.create(publicacion=publicacion, imagen=imagen, orden=siguiente + desplazamiento)

    def perform_create(self, serializer):
        nuevas = self._fotos_subidas()
        self._comprobar_cupo(None, nuevas)
        publicacion = serializer.save(autor=self.request.user)
        self._guardar_fotos(publicacion, nuevas)

    def perform_update(self, serializer):
        publicacion = serializer.instance
        nuevas = self._fotos_subidas()
        ids_eliminar = {int(v) for v in self.request.data.getlist('fotos_eliminar') if str(v).isdigit()}
        a_eliminar = list(publicacion.fotos.filter(id__in=ids_eliminar)) if ids_eliminar else []
        self._comprobar_cupo(publicacion, nuevas, len(a_eliminar))
        serializer.save()
        for foto in a_eliminar:
            foto.delete()
        self._guardar_fotos(publicacion, nuevas)


class PuedeComentar(permissions.BasePermission):
    """Leer comentarios: cualquiera. Escribir: cuentas con acceso al catálogo."""
    message = TieneAccesoAlCatalogo.message

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return TieneAccesoAlCatalogo().has_permission(request, view)


class ComentariosView(generics.ListCreateAPIView):
    serializer_class = ComentarioSerializer
    pagination_class = PaginacionEstandar
    permission_classes = [PuedeComentar]

    def get_publicacion(self):
        # Un borrador no existe para quien no sea staff (404, no 403).
        return get_object_or_404(
            publicaciones_visibles(self.request.user, incluir_borradores=True),
            pk=self.kwargs['publicacion_id'],
        )

    def get_queryset(self):
        return Comentario.objects.filter(publicacion=self.get_publicacion()).select_related('usuario')

    def perform_create(self, serializer):
        serializer.save(publicacion=self.get_publicacion(), usuario=self.request.user)


class ComentarioView(generics.DestroyAPIView):
    """Borra un comentario: el que lo escribió o el staff."""
    permission_classes = [permissions.IsAuthenticated]
    queryset = Comentario.objects.all()

    def destroy(self, request, *args, **kwargs):
        comentario = self.get_object()
        if not (request.user.is_staff or comentario.usuario_id == request.user.id):
            raise PermissionDenied('Solo puedes borrar tus propios comentarios.')
        comentario.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
