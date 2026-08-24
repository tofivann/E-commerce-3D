import os

from django.http import FileResponse, Http404
from rest_framework import generics, permissions
from rest_framework.views import APIView

from .models import ComprasDigitales
from .serializers import ComprasDigitalesSerializer


class MiBibliotecaView(generics.ListAPIView):
    """
    Biblioteca digital del usuario autenticado: modelos que ha adquirido
    y para los que conserva el permiso de descarga.
    """
    serializer_class = ComprasDigitalesSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            ComprasDigitales.objects
            .filter(usuario=self.request.user, activo=True)
            .select_related('producto', 'orden')
            .order_by('-fecha_adquisicion')
        )


class DescargarCompraView(APIView):
    """
    Descarga el archivo 3D de una compra digital, verificando que
    pertenezca al usuario autenticado y que el permiso siga activo.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            compra = ComprasDigitales.objects.select_related('producto').get(
                pk=pk, usuario=request.user, activo=True,
            )
        except ComprasDigitales.DoesNotExist:
            raise Http404("No tienes una compra activa con ese identificador.")

        archivo = compra.producto.archivo_3d
        if not archivo:
            raise Http404("El producto no tiene un archivo 3D asociado.")

        return FileResponse(
            archivo.open('rb'),
            as_attachment=True,
            filename=os.path.basename(archivo.name),
        )
