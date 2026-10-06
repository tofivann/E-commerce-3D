import json
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

from core import paypal_utils
from core.email_utils import enviar_email
from core.idiomas import EN, ES
from monedas.reglas import NOMBRE_MONEDAS, PASARELA_MONEDAS
from monedas.services import SaldoInsuficiente, revertir_por_comision_cancelada, saldo_de
from orders.models import Orden, ComprasDigitales
from products.models import Producto
from .models import EstadoComision, TramoPersonajesMotion, JuegoComision, ComisionMotion, ComisionModelo
from .permissions import EsAdminOSoloLectura
from .services import datos_comision_para_email, enviar_correo_comision_pagada, pagar_comision_con_monedas
from .serializers import (
    TramoPersonajesMotionSerializer,
    JuegoComisionSerializer,
    SolicitudComisionMotionSerializer,
    SolicitudComisionModeloSerializer,
    ComisionMotionSerializer,
    ComisionModeloSerializer,
    ComisionMotionAdminSerializer,
    ComisionModeloAdminSerializer,
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


def _crear_comision_motion(usuario, datos, pasarela, total, total_monedas=None):
    """Crea la Orden (PENDIENTE) y la ComisionMotion de una solicitud ya
    validada. Lo comparten las tres formas de pago; cada vista decide después
    cómo se cobra. `total` es lo que se cobra en dinero; en un pago con
    monedas es 0 y lo cobrado va en `total_monedas`."""
    orden = Orden.objects.create(
        codigo_orden=f"MOT-{uuid.uuid4().hex[:10].upper()}",
        usuario=usuario,
        total=total,
        total_monedas=total_monedas,
        estado_pago=Orden.EstadoPago.PENDIENTE,
        tipo_orden=Orden.TipoOrden.COMISION_MOTION,
        pasarela_pago=pasarela,
    )
    comision = ComisionMotion.objects.create(
        orden=orden,
        usuario=usuario,
        tramo_personajes=datos['tramo_personajes'],
        nombre_juego=datos['nombre_juego'],
        nombre_cancion=datos['nombre_cancion'],
        link_video=datos['link_video'],
        informacion_adicional=datos.get('informacion_adicional', ''),
    )
    return orden, comision


def _crear_comision_modelo(usuario, datos, pasarela, total, total_monedas=None):
    """Igual que `_crear_comision_motion`, para una comisión de Modelo."""
    orden = Orden.objects.create(
        codigo_orden=f"MOD-{uuid.uuid4().hex[:10].upper()}",
        usuario=usuario,
        total=total,
        total_monedas=total_monedas,
        estado_pago=Orden.EstadoPago.PENDIENTE,
        tipo_orden=Orden.TipoOrden.COMISION_MODELO,
        pasarela_pago=pasarela,
    )
    comision = ComisionModelo.objects.create(
        orden=orden,
        usuario=usuario,
        juego=datos['juego'],
        nombre_personaje=datos['nombre_personaje'],
        foto_referencia_1=datos['foto_referencia_1'],
        foto_referencia_2=datos.get('foto_referencia_2'),
    )
    return orden, comision


def _pagar_comision_con_monedas(request, serializer_entrada, campo_precio, crear, serializer_salida):
    """Solicitud de comisión pagada con monedas, común a Motion y Modelo: se
    cobra el precio en monedas del tramo/juego elegido (no hay "pagar de
    más" con monedas) y la comisión queda pagada en esta misma petición.

    Un 400 trae `motivo` ('saldo_insuficiente' | 'no_pagable') para que el
    frontend muestre el mensaje en su idioma."""
    entrada = serializer_entrada(data=request.data)
    entrada.is_valid(raise_exception=True)
    datos = entrada.validated_data
    precio_monedas = datos[campo_precio].precio_monedas
    if not precio_monedas:
        return Response(
            {"detail": f"Esta comisión no se puede pagar con {NOMBRE_MONEDAS}.", "motivo": "no_pagable"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Comisión y cobro, o ninguno de los dos.
        with transaction.atomic():
            orden, comision = crear(request.user, datos, PASARELA_MONEDAS, total=0, total_monedas=precio_monedas)
            pagar_comision_con_monedas(orden)
    except SaldoInsuficiente as e:
        return Response(
            {
                "detail": f"No tienes {NOMBRE_MONEDAS} suficientes: tienes {e.saldo} y hacen falta {e.necesarias}.",
                "motivo": "saldo_insuficiente",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Fuera de la transacción, como el resto de correos de pago.
    enviar_correo_comision_pagada(orden)
    comision.refresh_from_db()
    return Response(
        {
            "comision": serializer_salida(comision, context={'request': request}).data,
            "saldo_monedas": saldo_de(request.user),
        },
        status=status.HTTP_201_CREATED,
    )


def _crear_sesion_pago_comision(request, orden, tipo, nombre_producto_stripe):
    """
    Crea la Stripe Checkout Session para una comisión ya creada (Orden con
    total ya definido: el precio del tramo/juego elegido, o más si el cliente
    decidió pagar de más — ver MontoComisionMixin). Mismo patrón que
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


def _crear_orden_pago_paypal_comision(orden, tipo, descripcion):
    """Equivalente PayPal de _crear_sesion_pago_comision: crea la orden de
    PayPal ya con el total definido por el tramo/juego elegido."""
    return paypal_utils.crear_orden(
        total=orden.total,
        descripcion=descripcion,
        custom_id=json.dumps({'tipo': tipo, 'orden_id': str(orden.id)}),
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
        orden, comision = _crear_comision_motion(request.user, datos, 'Stripe', total=datos['monto'])

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


class SolicitarComisionMotionPayPalView(generics.CreateAPIView):
    """Igual que SolicitarComisionMotionView.create, pero crea una orden de PayPal."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SolicitudComisionMotionSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        entrada = SolicitudComisionMotionSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data
        tramo = datos['tramo_personajes']
        orden, comision = _crear_comision_motion(request.user, datos, 'PayPal', total=datos['monto'])

        try:
            orden_paypal = _crear_orden_pago_paypal_comision(
                orden, 'comision_motion', f"Comisión de Motion - {tramo.nombre}",
            )
        except paypal_utils.PayPalError as e:
            transaction.set_rollback(True)
            return Response(
                {"detail": f"No se pudo iniciar el pago con PayPal: {e}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        orden.paypal_order_id = orden_paypal["id"]
        orden.save(update_fields=['paypal_order_id'])

        return Response(
            {"paypal_order_id": orden_paypal["id"], "comision": ComisionMotionSerializer(comision, context={'request': request}).data},
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
        orden, comision = _crear_comision_modelo(request.user, datos, 'Stripe', total=datos['monto'])

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


class SolicitarComisionModeloPayPalView(generics.CreateAPIView):
    """Igual que SolicitarComisionModeloView.create, pero crea una orden de PayPal."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SolicitudComisionModeloSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        entrada = SolicitudComisionModeloSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data
        juego = datos['juego']
        orden, comision = _crear_comision_modelo(request.user, datos, 'PayPal', total=datos['monto'])

        try:
            orden_paypal = _crear_orden_pago_paypal_comision(
                orden, 'comision_modelo', f"Comisión de Modelo - {juego.nombre}",
            )
        except paypal_utils.PayPalError as e:
            transaction.set_rollback(True)
            return Response(
                {"detail": f"No se pudo iniciar el pago con PayPal: {e}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        orden.paypal_order_id = orden_paypal["id"]
        orden.save(update_fields=['paypal_order_id'])

        return Response(
            {"paypal_order_id": orden_paypal["id"], "comision": ComisionModeloSerializer(comision, context={'request': request}).data},
            status=status.HTTP_201_CREATED,
        )


class SolicitarComisionMotionMonedasView(APIView):
    """Solicita una comisión de Motion pagándola con monedas."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        return _pagar_comision_con_monedas(
            request, SolicitudComisionMotionSerializer, 'tramo_personajes',
            _crear_comision_motion, ComisionMotionSerializer,
        )


class SolicitarComisionModeloMonedasView(APIView):
    """Solicita una comisión de Modelo pagándola con monedas."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        return _pagar_comision_con_monedas(
            request, SolicitudComisionModeloSerializer, 'juego',
            _crear_comision_modelo, ComisionModeloSerializer,
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

    def perform_update(self, serializer):
        # Detecta el momento exacto en que se sube el archivo de entrega
        # (pasa de vacío a tener valor en este mismo PATCH) para mandar el
        # correo de "comisión completada" una sola vez, no en cada cambio de
        # estado o reemplazo posterior del archivo.
        tenia_archivo_antes = bool(serializer.instance.archivo_entrega)
        estado_antes = serializer.instance.estado
        # El cambio de estado y su efecto en monedas, o ninguno de los dos.
        with transaction.atomic():
            instance = serializer.save()
            if instance.estado == EstadoComision.CANCELADO and estado_antes != EstadoComision.CANCELADO:
                # Cancelar una comisión ya pagada deshace sus monedas: se
                # devuelven si se pagó con ellas, o se quitan las que dio.
                revertir_por_comision_cancelada(instance.orden)
        # Una comisión cancelada no se completa por subirle un archivo (el
        # panel ni siquiera ofrece el botón): ni cambia de estado ni se le
        # avisa al cliente que "está lista" — sería contradictorio con lo que
        # ve en su tarjeta.
        if not tenia_archivo_antes and instance.archivo_entrega and instance.estado != EstadoComision.CANCELADO:
            # Completar la entrega (archivo + foto + categorías, exigidos
            # juntos por ValidacionEntregaMixin) pasa la comisión a
            # COMPLETADO automáticamente — el admin ya no tiene que elegirlo
            # a mano en un <select> aparte después de subir el archivo.
            instance.estado = EstadoComision.COMPLETADO
            instance.save(update_fields=['estado'])

            # El idioma del CLIENTE (guardado en su cuenta), no el del admin
            # que está subiendo la entrega en esta petición.
            idioma = instance.usuario.idioma
            tipo_label, detalle = datos_comision_para_email(instance.orden, idioma)
            enviar_email(
                to=instance.usuario.email,
                asuntos={ES: "¡Tu comisión está lista! 🎉", EN: "Your commission is ready! 🎉"},
                template_name='custom_orders/email_comision_completada.html',
                context={
                    'codigo_orden': instance.orden.codigo_orden,
                    'tipo_label': tipo_label,
                    'detalle': detalle,
                    'frontend_url': settings.FRONTEND_URL,
                },
                idioma=idioma,
            )

    @action(detail=True, methods=['get'])
    def descargar(self, request, pk=None):
        """Archivo entregado de una comisión, para el admin (el viewset
        entero es solo staff). El cliente descarga por
        DescargarComision{Motion,Modelo}View, que comprueba que es suya."""
        return _descargar_archivo(self.get_object().archivo_entrega)

    def _publicar_producto(self, comision):
        """
        Compartido por ComisionMotionAdminViewSet y ComisionModeloAdminViewSet:
        crea (una sola vez) el Producto en el catálogo a partir de una comisión
        ya completada (archivo_entrega + foto_entrega + categorias, los tres
        obligatorios juntos — ver ValidacionEntregaMixin), y le da acceso
        inmediato al cliente que la pidió (vía ComprasDigitales, la misma
        tabla que respalda la biblioteca digital y el badge "En tu
        biblioteca" del catálogo) — ya pagó por esto al pedirlo, no debería
        verlo como "agregar al carrito" en la tienda solo porque también se
        puso a la venta para el resto de los clientes.

        No lee ningún body: título/descripción/precio/formato/video salen de
        los campos de reventa que el admin dejó guardados en la comisión al
        subir la entrega (DatosPublicacion en models.py) — por eso el
        frontend ya no tiene formulario de publicar, solo el de entrega.

        Devuelve (producto, None) si se publicó, o (None, Response) con el
        error si no se pudo — el caller decide qué serializer usar en la
        respuesta de éxito, por eso no arma el Response final aquí.
        """
        if comision.producto_publicado_id:
            return None, Response(
                {"detail": "Esta comisión ya fue publicada como producto."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not comision.archivo_entrega or not comision.foto_entrega or not comision.categorias.exists():
            return None, Response(
                {"detail": "Completa la comisión (archivo, foto y al menos una categoría) antes de publicar el producto."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not comision.publicacion_completa:
            return None, Response(
                {"detail": "Completa los datos de publicación (título, descripción, formato, al menos una forma de pago y su precio) antes de publicar el producto."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        producto = Producto.objects.create(
            titulo=comision.titulo_publicacion,
            descripcion=comision.descripcion_publicacion,
            acepta_dinero=comision.acepta_dinero_publicacion,
            acepta_monedas=comision.acepta_monedas_publicacion,
            # Sin dinero no se cobra dinero: el precio en $ queda en 0.
            precio=comision.precio_publicacion if comision.acepta_dinero_publicacion else 0,
            precio_monedas=comision.precio_monedas_publicacion,
            formato_archivo=comision.formato_archivo_publicacion,
            archivo_3d=comision.archivo_entrega,
            imagen_previa=comision.foto_entrega,
            link_youtube=comision.link_youtube or None,
        )
        # M2M no se puede pasar como kwarg de create(): el producto necesita
        # existir (tener pk) antes de poder asignarle categorías.
        producto.categorias.set(comision.categorias.all())
        comision.producto_publicado = producto
        comision.save(update_fields=['producto_publicado'])

        # comision.orden ya está pagada (es la orden de la propia comisión) —
        # se reutiliza como respaldo del permiso, no se crea una orden nueva.
        ComprasDigitales.objects.create(
            usuario=comision.usuario,
            producto=producto,
            orden=comision.orden,
        )

        return producto, None


class ComisionMotionAdminViewSet(ComisionAdminViewSetBase):
    queryset = ComisionMotion.objects.select_related('orden', 'usuario', 'tramo_personajes').order_by('-orden__fecha_orden')
    serializer_class = ComisionMotionAdminSerializer

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def publicar(self, request, pk=None):
        comision = self.get_object()
        _producto, error = self._publicar_producto(comision)
        if error:
            return error
        return Response(
            ComisionMotionAdminSerializer(comision, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class ComisionModeloAdminViewSet(ComisionAdminViewSetBase):
    queryset = ComisionModelo.objects.select_related('orden', 'usuario', 'juego').order_by('-orden__fecha_orden')
    serializer_class = ComisionModeloAdminSerializer

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def publicar(self, request, pk=None):
        comision = self.get_object()
        _producto, error = self._publicar_producto(comision)
        if error:
            return error
        return Response(
            ComisionModeloAdminSerializer(comision, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )
