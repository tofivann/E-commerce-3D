from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import PaginacionEstandar

from .models import MovimientoMonedas
from .reglas import NOMBRE_MONEDAS
from .serializers import AjusteMonedasSerializer, MovimientoMonedasSerializer
from .services import SaldoInsuficiente, ajustar_saldo, saldo_de


class MisMovimientosView(generics.ListAPIView):
    """`monedas/movimientos/`: el historial de monedas del usuario con sesión
    (lo más reciente primero, paginado). Siempre el suyo: no hay id en la
    dirección. El saldo actual viaja en su perfil (`users/me/`)."""
    serializer_class = MovimientoMonedasSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = PaginacionEstandar

    def get_queryset(self):
        return MovimientoMonedas.objects.filter(usuario=self.request.user).select_related('orden')


class AjustarMonedasAdminView(APIView):
    """`monedas/admin/ajustes/` (POST, solo staff): suma o quita monedas a un
    usuario a mano. Queda en su historial con el motivo y quién lo hizo."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        serializer = AjusteMonedasSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.validated_data['usuario']

        try:
            ajustar_saldo(
                usuario, serializer.validated_data['cantidad'], serializer.validated_data['nota'], request.user,
            )
        except SaldoInsuficiente as e:
            return Response(
                {"cantidad": [f"El usuario solo tiene {e.saldo} {NOMBRE_MONEDAS}: no se le pueden quitar {e.necesarias}."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"usuario": usuario.id, "saldo_monedas": saldo_de(usuario)})
