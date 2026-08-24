from django.db import models
from users.models import Usuario
from products.models import Producto

class Orden(models.Model):
    class EstadoPago(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        COMPLETADO = 'COMPLETADO', 'Completado'
        REEMBOLSADO = 'REEMBOLSADO', 'Reembolsado'
        CANCELADO = 'CANCELADO', 'Cancelado'

    class TipoOrden(models.TextChoices):
        CATALOGO = 'CATALOGO', 'Catálogo'
        ENCARGO = 'ENCARGO', 'Encargo Personalizado'

    codigo_orden = models.CharField(max_length=100, unique=True)
    usuario = models.ForeignKey(
        Usuario, 
        on_delete=models.CASCADE, 
        related_name='ordenes'
    )
    productos = models.ManyToManyField(Producto, through='DetalleOrden', related_name='ordenes')
    total = models.DecimalField(max_digits=10, decimal_places=2)
    estado_pago = models.CharField(
        max_length=20, 
        choices=EstadoPago.choices, 
        default=EstadoPago.PENDIENTE,
        db_index=True
    )
    tipo_orden = models.CharField(
        max_length=20, 
        choices=TipoOrden.choices, 
        default=TipoOrden.CATALOGO
    )
    pasarela_pago = models.CharField(max_length=50, help_text="Ej: Stripe, PayPal")
    stripe_session_id = models.CharField(
        max_length=255, blank=True, null=True, unique=True,
        help_text="ID de la Stripe Checkout Session que respalda esta orden.",
    )
    fecha_orden = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Orden"
        verbose_name_plural = "Órdenes"

    def __str__(self):
        return f"Orden {self.codigo_orden} - {self.usuario.nombre}"


class DetalleOrden(models.Model):
    orden = models.ForeignKey(
        Orden, 
        on_delete=models.CASCADE, 
        related_name='detalles'
    )
    producto = models.ForeignKey(Producto, on_delete=models.SET_NULL, null=True)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, help_text="Precio histórico al momento de la compra")

    class Meta:
        verbose_name = "Detalle de Orden"
        verbose_name_plural = "Detalles de Órdenes"

    def __str__(self):
        return f"{self.producto.titulo if self.producto else 'Producto Eliminado'} (${self.precio_unitario})"

class ComprasDigitales(models.Model):
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='compras_digitales'
    )
    producto = models.ForeignKey(
        Producto,
        on_delete=models.PROTECT,
        related_name='comprado_en'
    )
    orden = models.ForeignKey(
        Orden,
        on_delete=models.PROTECT,
        related_name='compras_digitales',
        help_text="Orden de compra que respaldó este permiso de descarga."
    )
    activo = models.BooleanField(
        default=True,
        help_text="Indica si el usuario conserva el permiso para descargar el archivo."
    )
    fecha_adquisicion = models.DateTimeField(auto_now_add=True)
    fecha_revocacion = models.DateTimeField(null=True, blank=True)# fecha de esa revocaión 
    motivo_revocacion = models.CharField(max_length=200, blank=True)# reembolso/reverso de pago, etc

    class Meta:
        db_table = 'compras_digitales'
        verbose_name = "Compra Digital"
        verbose_name_plural = "Compras Digitales"
        constraints = [
            models.UniqueConstraint(
                fields=['usuario', 'producto', 'orden'],
                name='uniq_compra_producto'
            ),
        ]
        indexes = [models.Index(fields=['usuario', 'activo'])]

    def __str__(self):
        estado_str = "Activo" if self.activo else "Inactivo"
        return f"{self.usuario.nombre} - {self.producto.titulo} [{estado_str}]"