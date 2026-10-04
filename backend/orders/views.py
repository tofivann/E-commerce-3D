import os

from django.http import FileResponse, Http404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import PaginacionEstandar
from .models import ComprasDigitales
from .serializers import ComprasDigitalesSerializer, VentaSerializer
from .ventas import FILTROS, resumen_de_ventas, ventas_de_filtro


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


class RangoDeFechasMixin:
    """Lee ?desde= y ?hasta= (instantes ISO 8601, p. ej. 2026-10-01T04:00:00Z)
    para las vistas de ventas. El rango es [desde, hasta): el frontend manda
    el inicio del primer día y el inicio del día siguiente al último, ya en
    la zona horaria del admin, así que aquí no se interpreta ninguna fecha
    "de calendario". Ambos son opcionales.
    """

    def rango_de_fechas(self):
        return self._instante('desde'), self._instante('hasta')

    def _instante(self, parametro):
        crudo = self.request.query_params.get(parametro)
        if not crudo:
            return None
        try:
            instante = parse_datetime(crudo)
        except ValueError:
            instante = None
        if instante is None:
            raise ValidationError({parametro: 'Fecha inválida. Se espera un instante ISO 8601.'})
        if timezone.is_naive(instante):
            instante = timezone.make_aware(instante)
        return instante


class VentasAdminView(RangoDeFechasMixin, generics.ListAPIView):
    """Listado paginado de ventas para "Estadísticas y pagos" (solo staff).
    ?filtro= una clave de orders.ventas.FILTROS (por defecto, todas)."""
    serializer_class = VentaSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = PaginacionEstandar

    def get_queryset(self):
        filtro = self.request.query_params.get('filtro', 'todas')
        if filtro not in FILTROS:
            raise ValidationError({'filtro': f'Filtro desconocido. Opciones: {", ".join(FILTROS)}.'})
        desde, hasta = self.rango_de_fechas()
        return (
            ventas_de_filtro(filtro, desde, hasta)
            .select_related(
                'usuario', 'comision_motion', 'comision_modelo__juego',
            )
            .prefetch_related('detalles__producto')
            # Orden determinista: requisito de la paginación.
            .order_by('-fecha_orden', '-id')
        )


class VentasResumenAdminView(RangoDeFechasMixin, APIView):
    """Total cobrado y cantidad de ventas de cada filtro, para el mismo
    rango de fechas que el listado (solo staff)."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        desde, hasta = self.rango_de_fechas()
        return Response(resumen_de_ventas(desde, hasta))
