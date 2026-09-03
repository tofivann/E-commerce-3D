import os
import uuid

import stripe
from django.conf import settings
from django.db import transaction
from django.http import FileResponse, Http404
from rest_framework import generics, mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Orden
from products.models import Producto
from .models import TramoPersonajesMotion, JuegoComision, ComisionMotion, ComisionModelo
from .permissions import EsAdminOSoloLectura
from .serializers import (
    TramoPersonajesMotionSerializer,
    JuegoComisionSerializer,
    SolicitudComisionMotionSerializer,
    SolicitudComisionModeloSerializer,
    ComisionMotionSerializer,
    ComisionModeloSerializer,
    ComisionMotionAdminSerializer,
    ComisionModeloAdminSerializer,
    PublicarProductoSerializer,
)

stripe.api_key = settings.STRIPE_SECRET_KEY


class TramoPersonajesMotionViewSet(viewsets.ModelViewSet):
    queryset = TramoPersonajesMotion.objects.all()
    serializer_class = TramoPersonajesMotionSerializer
    permission_classes = [EsAdminOSoloLectura]


class JuegoComisionViewSet(viewsets.ModelViewSet):
    queryset = JuegoComision.objects.all()
    serializer_class = JuegoComisionSerializer
    permission_classes = [EsAdminOSoloLectura]


def _crear_sesion_pago_comision(request, orden, tipo, nombre_producto_stripe):
    """
    Crea la Stripe Checkout Session para una comisión ya creada (Orden con
    total ya definido por el tramo/juego elegido). Mismo patrón que
    shopping_cart.views.CheckoutView.
    """
    return stripe.checkout.Session.create(
        mode='payment',
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'unit_amount': int(orden.total * 100),
                'product_data': {'name': nombre_producto_stripe},
            },
            'quantity': 1,
        }],
        success_url=f"{settings.FRONTEND_URL}/comisiones?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.FRONTEND_URL}/comisiones",
        client_reference_id=str(request.user.id),
        metadata={'tipo': tipo, 'orden_id': str(orden.id)},
    )


class SolicitarComisionMotionView(generics.ListCreateAPIView):
    """
    GET: lista las comisiones de Motion del usuario autenticado.
    POST: crea la Orden + ComisionMotion y devuelve la URL de pago de Stripe.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return ComisionMotionSerializer if self.request.method == 'GET' else SolicitudComisionMotionSerializer

    def get_queryset(self):
        return (
            ComisionMotion.objects
            .filter(usuario=self.request.user)
            .select_related('orden', 'tramo_personajes')
            .order_by('-orden__fecha_orden')
        )

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        entrada = SolicitudComisionMotionSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data
        tramo = datos['tramo_personajes']

        orden = Orden.objects.create(
            codigo_orden=f"MOT-{uuid.uuid4().hex[:10].upper()}",
            usuario=request.user,
            total=tramo.precio,
            estado_pago=Orden.EstadoPago.PENDIENTE,
            tipo_orden=Orden.TipoOrden.COMISION_MOTION,
            pasarela_pago='Stripe',
        )
        comision = ComisionMotion.objects.create(
            orden=orden,
            usuario=request.user,
            tramo_personajes=tramo,
            nombre_juego=datos['nombre_juego'],
            nombre_cancion=datos['nombre_cancion'],
            link_video=datos['link_video'],
            informacion_adicional=datos.get('informacion_adicional', ''),
        )

        try:
            session = _crear_sesion_pago_comision(
                request, orden, 'comision_motion',
                f"Comisión de Motion - {tramo.nombre}",
            )
        except stripe.StripeError as e:
            transaction.set_rollback(True)
            return Response(
                {"detail": f"No se pudo iniciar el pago con Stripe: {e.user_message or str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        orden.stripe_session_id = session.id
        orden.save(update_fields=['stripe_session_id'])

        return Response(
            {"checkout_url": session.url, "comision": ComisionMotionSerializer(comision, context={'request': request}).data},
            status=status.HTTP_201_CREATED,
        )


class SolicitarComisionModeloView(generics.ListCreateAPIView):
    """
    GET: lista las comisiones de Modelo del usuario autenticado.
    POST: crea la Orden + ComisionModelo (multipart, 2 fotos de referencia) y
    devuelve la URL de pago de Stripe.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return ComisionModeloSerializer if self.request.method == 'GET' else SolicitudComisionModeloSerializer

    def get_queryset(self):
        return (
            ComisionModelo.objects
            .filter(usuario=self.request.user)
            .select_related('orden', 'juego')
            .order_by('-orden__fecha_orden')
        )

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        entrada = SolicitudComisionModeloSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data
        juego = datos['juego']

        orden = Orden.objects.create(
            codigo_orden=f"MOD-{uuid.uuid4().hex[:10].upper()}",
            usuario=request.user,
            total=juego.precio,
            estado_pago=Orden.EstadoPago.PENDIENTE,
            tipo_orden=Orden.TipoOrden.COMISION_MODELO,
            pasarela_pago='Stripe',
        )
        comision = ComisionModelo.objects.create(
            orden=orden,
            usuario=request.user,
            juego=juego,
            nombre_personaje=datos['nombre_personaje'],
            foto_referencia_1=datos['foto_referencia_1'],
            foto_referencia_2=datos.get('foto_referencia_2'),
        )

        try:
            session = _crear_sesion_pago_comision(
                request, orden, 'comision_modelo',
                f"Comisión de Modelo - {juego.nombre}",
            )
        except stripe.StripeError as e:
            transaction.set_rollback(True)
            return Response(
                {"detail": f"No se pudo iniciar el pago con Stripe: {e.user_message or str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        orden.stripe_session_id = session.id
        orden.save(update_fields=['stripe_session_id'])

        return Response(
            {"checkout_url": session.url, "comision": ComisionModeloSerializer(comision, context={'request': request}).data},
            status=status.HTTP_201_CREATED,
        )


def _descargar_archivo(archivo):
    if not archivo:
        raise Http404("Esta comisión todavía no tiene un archivo de entrega.")
    return FileResponse(archivo.open('rb'), as_attachment=True, filename=os.path.basename(archivo.name))


class DescargarComisionMotionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            comision = ComisionMotion.objects.get(pk=pk, usuario=request.user)
        except ComisionMotion.DoesNotExist:
            raise Http404("No tienes una comisión con ese identificador.")
        return _descargar_archivo(comision.archivo_entrega)


class DescargarComisionModeloView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            comision = ComisionModelo.objects.get(pk=pk, usuario=request.user)
        except ComisionModelo.DoesNotExist:
            raise Http404("No tienes una comisión con ese identificador.")
        return _descargar_archivo(comision.archivo_entrega)


class ComisionAdminViewSetBase(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    Sin create/destroy a propósito: las comisiones solo las crea el cliente
    (SolicitarComisionMotionView/SolicitarComisionModeloView). El admin solo
    lista, ve el detalle y actualiza (estado/archivo_entrega), más las
    acciones extra que declare cada subclase (ej. 'publicar').
    """
    permission_classes = [permissions.IsAdminUser]


class ComisionMotionAdminViewSet(ComisionAdminViewSetBase):
    queryset = ComisionMotion.objects.select_related('orden', 'usuario', 'tramo_personajes').order_by('-orden__fecha_orden')
    serializer_class = ComisionMotionAdminSerializer


class ComisionModeloAdminViewSet(ComisionAdminViewSetBase):
    queryset = ComisionModelo.objects.select_related('orden', 'usuario', 'juego').order_by('-orden__fecha_orden')
    serializer_class = ComisionModeloAdminSerializer

    @action(detail=True, methods=['post'])
    def publicar(self, request, pk=None):
        """Crea (una sola vez) el Producto en el catálogo a partir de esta comisión ya completada."""
        comision = self.get_object()
        if comision.producto_publicado_id:
            return Response(
                {"detail": "Esta comisión ya fue publicada como producto."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not comision.archivo_entrega:
            return Response(
                {"detail": "Sube el archivo de entrega antes de publicar el producto."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        datos = PublicarProductoSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        validados = datos.validated_data

        producto = Producto.objects.create(
            titulo=validados['titulo'],
            descripcion=validados['descripcion'],
            precio=validados['precio'],
            formato_archivo=validados['formato_archivo'],
            archivo_3d=comision.archivo_entrega,
            imagen_previa=validados.get('imagen_previa') or comision.foto_referencia_1,
        )
        comision.producto_publicado = producto
        comision.save(update_fields=['producto_publicado'])

        return Response(
            ComisionModeloAdminSerializer(comision, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )
