from django.db import models
from django.contrib.auth.models import AbstractUser


# ------------------------------------------------------------------------------
# 1. USUARIOS Y PERFILES
# ------------------------------------------------------------------------------

class Usuario(AbstractUser):
    """
    Modelo de Usuario personalizado basado en el AbstractUser de Django.
    Aprovecha la autenticación nativa (hash de contraseñas, permisos, etc.).
    """
    email = models.EmailField(unique=True, max_length=150)
    nombre = models.CharField(max_length=100)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'nombre']

    def __str__(self):
        return f"{self.nombre} ({self.email})"


class Administrador(models.Model):
    class NivelAcceso(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
        ADMIN = 'ADMIN', 'Administrador'

    usuario = models.OneToOneField(
        Usuario, 
        on_delete=models.CASCADE, 
        primary_key=True,
        related_name='perfil_admin'
    )
    nivel_acceso = models.CharField(
        max_length=20, 
        choices=NivelAcceso.choices, 
        default=NivelAcceso.SUPER_ADMIN
    )

    def __str__(self):
        return f"Admin: {self.usuario.nombre}"


class Cliente(models.Model):
    class EstadoSuscripcion(models.TextChoices):
        ACTIVO = 'ACT', 'Activo'
        INACTIVO = 'INA', 'Inactivo'

    usuario = models.OneToOneField(
        Usuario, 
        on_delete=models.CASCADE, 
        primary_key=True,
        related_name='perfil_cliente'
    )
    estado_suscripcion = models.CharField(
        max_length=3, 
        choices=EstadoSuscripcion.choices, 
        default=EstadoSuscripcion.INACTIVO
    )

    def __str__(self):
        return f"Cliente: {self.usuario.nombre}"


# ------------------------------------------------------------------------------
# 2. CATÁLOGO DE PRODUCTOS (MODELOS 3D / ARCHIVOS)
# ------------------------------------------------------------------------------

class Producto(models.Model):
    titulo = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, null=True)
    formato_archivo = models.CharField(max_length=20, help_text="Ej: OBJ, FBX, STL, BLEND")
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    archivo_url = models.URLField(max_length=255, help_text="Enlace al archivo 3D o almacenamiento cloud")
    imagen_url_preview = models.URLField(max_length=255, help_text="Enlace a la vista previa / render")
    activo = models.BooleanField(default=True)
    fecha_de_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.titulo


# ------------------------------------------------------------------------------
# 3. CARRITO DE COMPRAS
# ------------------------------------------------------------------------------

class CarritoItem(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='carrito_items')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='en_carritos')
    cantidad = models.PositiveIntegerField(default=1)

    class Meta:
        verbose_name = "Item de Carrito"
        verbose_name_plural = "Items de Carrito"
        unique_together = ('cliente', 'producto')

    def __str__(self):
        return f"{self.cantidad}x {self.producto.titulo} (Cliente: {self.cliente.usuario.nombre})"


# ------------------------------------------------------------------------------
# 4. ÓRDENES Y DETALLES
# ------------------------------------------------------------------------------

class Orden(models.Model):
    class TipoOrden(models.TextChoices):
        CATALOGO = 'CATALOGO', 'Catálogo'
        ENCARGO = 'ENCARGO', 'Encargo Personalizado'

    class PasarelaPago(models.TextChoices):
        PAYPAL = 'PAYPAL', 'PayPal'
        STRIPE = 'STRIPE', 'Stripe'

    class EstadoPago(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        COMPLETADO = 'COMPLETADO', 'Completado'
        CANCELADO = 'CANCELADO', 'Cancelado'

    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='ordenes')
    tipo_de_orden = models.CharField(max_length=20, choices=TipoOrden.choices)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    pasarela_de_pago = models.CharField(max_length=20, choices=PasarelaPago.choices)
    transaccion_pasarela_id = models.CharField(max_length=255, blank=True, null=True)
    estado_de_pago = models.CharField(max_length=20, choices=EstadoPago.choices, default=EstadoPago.PENDIENTE)
    fecha_orden = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Orden #{self.id} - {self.cliente.usuario.nombre} ({self.estado_de_pago})"


class DetalleOrden(models.Model):
    orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey(Producto, on_delete=models.SET_NULL, null=True, related_name='detalles_orden')
    cantidad = models.PositiveIntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"Detalle Orden #{self.orden.id} - Producto: {self.producto}"


# ------------------------------------------------------------------------------
# 5. ENCARGOS PERSONALIZADOS
# ------------------------------------------------------------------------------

class EncargoPersonalizado(models.Model):
    class EstadoEncargo(models.TextChoices):
        SOLICITADO = 'SOLICITADO', 'Solicitado'
        EN_PROCESO = 'EN_PROCESO', 'En Proceso'
        REVISION = 'REVISION', 'En Revisión'
        COMPLETADO = 'COMPLETADO', 'Completado'
        CANCELADO = 'CANCELADO', 'Cancelado'

    orden = models.OneToOneField(Orden, on_delete=models.CASCADE, related_name='encargo_personalizado')
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='encargos')
    brief_instrucciones = models.TextField()
    archivos_de_referencia_url = models.TextField(blank=True, null=True, help_text="URLs o referencias de archivos adjuntos")
    presupuesto_estimado = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_de_entrega_estimada = models.DateField(blank=True, null=True)
    estado_de_encargo = models.CharField(
        max_length=20, 
        choices=EstadoEncargo.choices, 
        default=EstadoEncargo.SOLICITADO
    )
    archivo_final_url = models.CharField(max_length=255, blank=True, null=True, help_text="Enlace de entrega del modelo 3D final")

    def __str__(self):
        return f"Encargo #{self.id} - Orden #{self.orden.id}"


# ------------------------------------------------------------------------------
# 6. MÓDULO DE CHAT / CONVERSACIONES
# ------------------------------------------------------------------------------

class Conversacion(models.Model):
    cliente = models.OneToOneField(Cliente, on_delete=models.CASCADE, related_name='conversacion')
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Conversación con {self.cliente.usuario.nombre}"
