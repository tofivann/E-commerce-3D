import os

from rest_framework import serializers

from orders.models import Orden
from products.models import Categoria
from products.serializers import CategoriaSerializer
from .models import TramoPersonajesMotion, JuegoComision, ComisionMotion, ComisionModelo


class TramoPersonajesMotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TramoPersonajesMotion
        fields = [
            'id', 'nombre', 'min_personajes', 'max_personajes', 'precio', 'precio_monedas', 'activo',
            'orden_visualizacion',
        ]


class JuegoComisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = JuegoComision
        fields = ['id', 'nombre', 'precio', 'precio_monedas', 'activo']


class OrdenResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Orden
        # total_monedas y pasarela_pago: para mostrar "10 monedas" en vez de
        # "$0.00" en una comisión pagada con monedas.
        fields = ['id', 'codigo_orden', 'total', 'total_monedas', 'pasarela_pago', 'estado_pago', 'fecha_orden']
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Solicitud (input) — el view arma Orden + Comisión a partir de esto,
# siguiendo el mismo patrón que RegistroView/CheckoutView (orquestación en
# la vista, no en el serializer).
# ---------------------------------------------------------------------------

class MontoComisionMixin:
    """Monto que paga el cliente por la comisión, compartido por las dos
    solicitudes. El precio del tramo/juego elegido es el MÍNIMO: el cliente
    puede pagar más si quiere, nunca menos. Si no manda `monto`, se cobra
    ese mínimo (el comportamiento de siempre).

    Deja siempre `monto` resuelto en validated_data, así las vistas hacen
    `total=datos['monto']` sin repetir la regla. No hay tope máximo: el
    frontend pide confirmación cuando el monto supera el mínimo y la
    pasarela muestra el total antes de cobrar.

    Cada serializer declara su propio campo `monto` (los mixins que no
    heredan de Serializer no aportan campos declarados) y en `campo_precio`
    el nombre del campo cuyo objeto trae el `.precio` mínimo.
    """
    campo_precio = None

    def validate(self, attrs):
        attrs = super().validate(attrs)
        minimo = attrs[self.campo_precio].precio
        monto = attrs.get('monto')
        if monto is None:
            attrs['monto'] = minimo
        elif monto < minimo:
            raise serializers.ValidationError(
                {'monto': f'El monto no puede ser menor al precio mínimo (${minimo}).'}
            )
        return attrs


def campo_monto():
    # Mismos dígitos que Orden.total, que es donde termina guardado.
    return serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)


class SolicitudComisionMotionSerializer(MontoComisionMixin, serializers.Serializer):
    campo_precio = 'tramo_personajes'

    tramo_personajes = serializers.PrimaryKeyRelatedField(
        queryset=TramoPersonajesMotion.objects.filter(activo=True)
    )
    nombre_juego = serializers.CharField(max_length=150)
    nombre_cancion = serializers.CharField(max_length=150)
    link_video = serializers.URLField(max_length=500)
    informacion_adicional = serializers.CharField(required=False, allow_blank=True, default='')
    monto = campo_monto()


class SolicitudComisionModeloSerializer(MontoComisionMixin, serializers.Serializer):
    campo_precio = 'juego'

    juego = serializers.PrimaryKeyRelatedField(queryset=JuegoComision.objects.filter(activo=True))
    nombre_personaje = serializers.CharField(max_length=150)
    foto_referencia_1 = serializers.ImageField()
    foto_referencia_2 = serializers.ImageField(required=False)
    monto = campo_monto()


# ---------------------------------------------------------------------------
# Lectura (cliente) — de solo lectura, incluye la orden anidada y el link de
# descarga (solo presente cuando ya se subió el archivo de entrega).
# ---------------------------------------------------------------------------

# Miniaturas de las fotos de una comisión de modelo (solo lectura: las genera
# el servidor, ver core/miniaturas.py). Para tarjetas y listas.
MINIATURAS_MODELO = ('foto_referencia_1_miniatura', 'foto_referencia_2_miniatura', 'foto_entrega_miniatura')


class ComisionMotionSerializer(serializers.ModelSerializer):
    orden = OrdenResumenSerializer(read_only=True)
    tramo_personajes = TramoPersonajesMotionSerializer(read_only=True)
    categorias = CategoriaSerializer(many=True, read_only=True)
    descarga_url = serializers.SerializerMethodField()

    class Meta:
        model = ComisionMotion
        fields = [
            'id', 'orden', 'tramo_personajes', 'nombre_juego', 'nombre_cancion',
            'link_video', 'informacion_adicional', 'estado', 'foto_entrega', 'foto_entrega_miniatura',
            'categorias', 'producto_publicado', 'descarga_url',
        ]
        read_only_fields = fields

    def get_descarga_url(self, obj):
        if not obj.archivo_entrega:
            return None
        request = self.context.get('request')
        path = f'/api/v1/custom-orders/comisiones/motion/{obj.id}/descargar/'
        return request.build_absolute_uri(path) if request else path


class ComisionModeloSerializer(serializers.ModelSerializer):
    orden = OrdenResumenSerializer(read_only=True)
    juego = JuegoComisionSerializer(read_only=True)
    categorias = CategoriaSerializer(many=True, read_only=True)
    descarga_url = serializers.SerializerMethodField()

    class Meta:
        model = ComisionModelo
        fields = [
            'id', 'orden', 'juego', 'nombre_personaje', 'foto_referencia_1', 'foto_referencia_2',
            *MINIATURAS_MODELO, 'estado', 'foto_entrega', 'categorias', 'producto_publicado', 'descarga_url',
        ]
        read_only_fields = fields

    def get_descarga_url(self, obj):
        if not obj.archivo_entrega:
            return None
        request = self.context.get('request')
        path = f'/api/v1/custom-orders/comisiones/modelo/{obj.id}/descargar/'
        return request.build_absolute_uri(path) if request else path


# ---------------------------------------------------------------------------
# Admin — puede cambiar estado y subir el archivo de entrega.
# ---------------------------------------------------------------------------

class ValidacionEntregaMixin:
    """
    Compartida por ComisionMotionAdminSerializer y ComisionModeloAdminSerializer:
    archivo_entrega, foto_entrega y categorias se suben juntos desde el modal de
    "completar comisión" del frontend — si se está tocando cualquiera de los
    tres, los tres deben terminar con valor (nunca uno o dos sin el resto).
    categorias es M2M (una lista, no un solo valor) — "tener valor" para ese
    campo significa que la lista no quede vacía.
    """
    CAMPOS_ENTREGA_SIMPLES = ('archivo_entrega', 'foto_entrega')

    def validate(self, attrs):
        if any(campo in attrs for campo in self.CAMPOS_ENTREGA_SIMPLES) or 'categorias' in attrs:
            archivo = attrs.get('archivo_entrega', getattr(self.instance, 'archivo_entrega', None))
            foto = attrs.get('foto_entrega', getattr(self.instance, 'foto_entrega', None))
            if 'categorias' in attrs:
                categorias = attrs['categorias']
            else:
                categorias = list(self.instance.categorias.all()) if self.instance else []
            if not archivo or not foto or not categorias:
                raise serializers.ValidationError(
                    "El archivo de entrega, la foto del resultado y al menos una categoría deben subirse juntos."
                )
        return attrs


# Datos de reventa (DatosPublicacion en models.py): los llena el admin en el
# mismo PATCH que sube la entrega, todos opcionales — se exigen recién al
# publicar (_publicar_producto). Deliberadamente fuera del trío de
# ValidacionEntregaMixin: se pueden completar en otro momento.
CAMPOS_PUBLICACION = [
    'titulo_publicacion', 'descripcion_publicacion', 'acepta_dinero_publicacion', 'acepta_monedas_publicacion',
    'precio_publicacion', 'precio_monedas_publicacion', 'formato_archivo_publicacion', 'link_youtube',
]


class URLConEsquemaField(serializers.URLField):
    """URLField que acepta el link como suele venir pegado desde la barra del
    navegador o el botón "Compartir": sin "https://" ("youtube.com/watch?v=...").
    Se le antepone el esquema ANTES de la validación de formato (por eso va en
    to_internal_value y no en validate_<campo>, que corre después y ya
    llegaría tarde); el resto lo sigue validando el URLField normal.
    """

    def to_internal_value(self, data):
        if isinstance(data, str) and data.strip() and '://' not in data:
            data = f'https://{data.strip()}'
        return super().to_internal_value(data)


class ValidacionPublicacionMixin:
    """Reglas de los datos de reventa, compartidas por los dos serializers
    admin. Van en `validate_<campo>` para que DRF devuelva el error bajo el
    nombre del campo y el modal pueda mostrarlo al lado del input.
    """

    def validate_precio_publicacion(self, valor):
        if valor is not None and valor < 0:
            raise serializers.ValidationError('El precio no puede ser negativo.')
        return valor

    def validate(self, attrs):
        attrs = super().validate(attrs)
        # Al menos una forma de pago (el precio de cada una se exige recién
        # al publicar, como el resto de datos de reventa).
        def valor(campo):
            return attrs[campo] if campo in attrs else getattr(self.instance, campo, False)

        if 'acepta_dinero_publicacion' in attrs or 'acepta_monedas_publicacion' in attrs:
            if not valor('acepta_dinero_publicacion') and not valor('acepta_monedas_publicacion'):
                raise serializers.ValidationError({'acepta_dinero_publicacion': 'Marca al menos una forma de pago.'})
        return attrs


# El archivo de entrega solo ENTRA por estos serializers (lo sube el admin):
# su dirección no se devuelve, porque los archivos entregados no se sirven
# por /media/ (core/media.py). El panel recibe el nombre del archivo —y con
# él, si ya hay entrega— y lo baja por la acción `descargar` del viewset.
ARCHIVO_ENTREGA_SOLO_ESCRITURA = {'archivo_entrega': {'write_only': True}}


class NombreArchivoEntregaMixin:
    def get_archivo_entrega_nombre(self, comision):
        return os.path.basename(comision.archivo_entrega.name) if comision.archivo_entrega else None


class ComisionMotionAdminSerializer(NombreArchivoEntregaMixin, ValidacionPublicacionMixin, ValidacionEntregaMixin, serializers.ModelSerializer):
    orden = OrdenResumenSerializer(read_only=True)
    tramo_personajes = TramoPersonajesMotionSerializer(read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True)
    usuario_email = serializers.EmailField(source='usuario.email', read_only=True)
    # Mismo par que ProductoSerializer: `categorias` son ids (lo que el admin
    # escribe en el PATCH) y `categorias_detalle` los objetos completos para
    # mostrar — el frontend usa siempre el segundo para leer. Antes solo
    # existía `categorias` con ids, y el modal hacía `.id` sobre un número.
    categorias = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.filter(activo=True), many=True, required=False,
    )
    categorias_detalle = CategoriaSerializer(source='categorias', many=True, read_only=True)
    link_youtube = URLConEsquemaField(max_length=500, required=False, allow_blank=True, allow_null=True)
    # Propiedad del modelo, no columna: hay que declararla para exponerla.
    publicacion_completa = serializers.BooleanField(read_only=True)
    archivo_entrega_nombre = serializers.SerializerMethodField()

    class Meta:
        model = ComisionMotion
        fields = [
            'id', 'orden', 'usuario_nombre', 'usuario_email', 'tramo_personajes', 'nombre_juego',
            'nombre_cancion', 'link_video', 'informacion_adicional', 'estado', 'archivo_entrega',
            'archivo_entrega_nombre', 'foto_entrega', 'foto_entrega_miniatura', 'categorias', 'categorias_detalle',
            'producto_publicado',
            *CAMPOS_PUBLICACION, 'publicacion_completa',
        ]
        read_only_fields = [
            'id', 'orden', 'usuario_nombre', 'usuario_email', 'tramo_personajes', 'nombre_juego',
            'nombre_cancion', 'link_video', 'informacion_adicional', 'producto_publicado', 'foto_entrega_miniatura',
        ]
        extra_kwargs = ARCHIVO_ENTREGA_SOLO_ESCRITURA


class ComisionModeloAdminSerializer(NombreArchivoEntregaMixin, ValidacionPublicacionMixin, ValidacionEntregaMixin, serializers.ModelSerializer):
    orden = OrdenResumenSerializer(read_only=True)
    juego = JuegoComisionSerializer(read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True)
    usuario_email = serializers.EmailField(source='usuario.email', read_only=True)
    categorias = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.filter(activo=True), many=True, required=False,
    )
    categorias_detalle = CategoriaSerializer(source='categorias', many=True, read_only=True)
    link_youtube = URLConEsquemaField(max_length=500, required=False, allow_blank=True, allow_null=True)
    publicacion_completa = serializers.BooleanField(read_only=True)
    archivo_entrega_nombre = serializers.SerializerMethodField()

    class Meta:
        model = ComisionModelo
        fields = [
            'id', 'orden', 'usuario_nombre', 'usuario_email', 'juego', 'nombre_personaje',
            'foto_referencia_1', 'foto_referencia_2', *MINIATURAS_MODELO, 'estado', 'archivo_entrega',
            'archivo_entrega_nombre', 'foto_entrega',
            'categorias', 'categorias_detalle', 'producto_publicado',
            *CAMPOS_PUBLICACION, 'publicacion_completa',
        ]
        read_only_fields = [
            'id', 'orden', 'usuario_nombre', 'usuario_email', 'juego', 'nombre_personaje',
            'foto_referencia_1', 'foto_referencia_2', 'producto_publicado', *MINIATURAS_MODELO,
        ]
        extra_kwargs = ARCHIVO_ENTREGA_SOLO_ESCRITURA

