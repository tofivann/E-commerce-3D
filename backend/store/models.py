from django.db import models
from django.contrib.auth.models import AbstractUser


# ------------------------------------------------------------------------------
# 1. USUARIOS Y ROLES (MODELO UNIFICADO)
# ------------------------------------------------------------------------------

class Usuario(AbstractUser):
    class Rol(models.TextChoices):
        CLIENTE = 'CLIENTE', 'Cliente'
        ADMIN = 'ADMIN', 'Administrador'

    class EstadoSuscripcion(models.TextChoices):
        INACTIVO = 'INACTIVO', 'Inactivo'
        PENDIENTE_PAGO = 'PENDIENTE_PAGO', 'Pendiente de Pago'
        ACTIVO = 'ACTIVO', 'Activo'
        NO_APLICA = 'NO_APLICA', 'No Aplica'  # Para Administradores

    nombre = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    rol = models.CharField(
        max_length=20, 
        choices=Rol.choices, 
        default=Rol.CLIENTE,
        db_index=True,  # Búsqueda ultra rápida por rol
        help_text="Define los permisos del usuario dentro de la plataforma."
    )
    estado_suscripcion = models.CharField(
        max_length=20,
        choices=EstadoSuscripcion.choices,
        default=EstadoSuscripcion.INACTIVO,
        db_index=True,  # Búsqueda rápida por estado de suscripción
        help_text="Estado del pago de suscripción."
    )
    fecha_registro = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'nombre']

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"

    def __str__(self):
        return f"{self.nombre} ({self.get_rol_display()}) - {self.email}"

    @property
    def es_suscripto_activo(self):
        return self.rol == self.Rol.CLIENTE and self.estado_suscripcion == self.EstadoSuscripcion.ACTIVO


# ------------------------------------------------------------------------------
# 2. CATÁLOGO DE PRODUCTOS (MODELOS 3D)
# ------------------------------------------------------------------------------

class Producto(models.Model):
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    formato_archivo = models.CharField(max_length=50, help_text="Ej: STL, OBJ, FBX")
    archivo_3d = models.FileField(upload_to='modelos_3d/')
    imagen_previa = models.URLField(
        max_length=500, 
        null=True, 
        blank=True, 
        help_text="URL de la imagen de previsualización (Ej: Supabase Storage / S3)"
    )
    activo = models.BooleanField(default=True, db_index=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"

    def __str__(self):
        return self.titulo


# ------------------------------------------------------------------------------
# 3. CARRITO DE COMPRAS (RELACIÓN M2M MEDIANTE CARRITOITEM)
# ------------------------------------------------------------------------------

class Carrito(models.Model):
    usuario = models.OneToOneField(
        Usuario, 
        on_delete=models.CASCADE, 
        related_name='carrito'
    )
    # Relación M:N explícita usando CarritoItem como tabla intermedia
    productos = models.ManyToManyField(Producto, through='CarritoItem', related_name='carritos')
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Carrito"
        verbose_name_plural = "Carritos"

    def __str__(self):
        return f"Carrito de {self.usuario.nombre}"


class CarritoItem(models.Model):
    carrito = models.ForeignKey(
        Carrito, 
        on_delete=models.CASCADE, 
        related_name='items'
    )
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)

    class Meta:
        verbose_name = "Ítem de Carrito"
        verbose_name_plural = "Ítems de Carrito"
        unique_together = ('carrito', 'producto')  # Evita duplicar el mismo modelo en el carrito

    def __str__(self):
        return f"{self.producto.titulo} en carrito de {self.carrito.usuario.nombre}"


# ------------------------------------------------------------------------------
# 4. ÓRDENES Y DETALLES (RELACIÓN M2M MEDIANTE DETALLEORDEN)
# ------------------------------------------------------------------------------

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
    # Relación M:N explícita usando DetalleOrden como tabla intermedia
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
    # Preserva la venta si el producto se elimina del catálogo general
    producto = models.ForeignKey(Producto, on_delete=models.SET_NULL, null=True)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, help_text="Precio histórico al momento de la compra")

    class Meta:
        verbose_name = "Detalle de Orden"
        verbose_name_plural = "Detalles de Órdenes"

    def __str__(self):
        return f"{self.producto.titulo if self.producto else 'Producto Eliminado'} (${self.precio_unitario})"


# ------------------------------------------------------------------------------
# 5. COMPRAS DIGITALES (ACCESO / HISTORIAL DE DESCARGAS)
# ------------------------------------------------------------------------------

class ComprasDigitales(models.Model):
    usuario = models.ForeignKey(
        Usuario, 
        on_delete=models.CASCADE, 
        related_name='compras_digitales'
    )
    producto = models.ForeignKey(
        Producto, 
        on_delete=models.CASCADE, 
        related_name='comprado_en'
    )
    orden = models.ForeignKey(
        Orden, 
        on_delete=models.CASCADE, 
        related_name='compras_digitales',
        help_text="Orden de compra que respaldó este permiso de descarga."
    )
    activo = models.BooleanField(
        default=True, 
        help_text="Indica si el usuario conserva el permiso para descargar el archivo."
    )
    fecha_adquisicion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'compras_digitales'
        verbose_name = "Compra Digital"
        verbose_name_plural = "Compras Digitales"
        unique_together = ('usuario', 'producto', 'orden')

    def __str__(self):
        estado_str = "Activo" if self.activo else "Inactivo"
        return f"{self.usuario.nombre} - {self.producto.titulo} [{estado_str}]"


# ------------------------------------------------------------------------------
# 6. ENCARGOS PERSONALIZADOS
# ------------------------------------------------------------------------------

class EncargoPersonalizado(models.Model):
    class EstadoEncargo(models.TextChoices):
        SOLICITADO = 'SOLICITADO', 'Solicitado'
        EN_PROCESO = 'EN_PROCESO', 'En Proceso'
        COMPLETADO = 'COMPLETADO', 'Completado'
        CANCELADO = 'CANCELADO', 'Cancelado'

    orden = models.OneToOneField(
        Orden, 
        on_delete=models.CASCADE, 
        related_name='encargo'
    )
    usuario = models.ForeignKey(
        Usuario, 
        on_delete=models.CASCADE, 
        related_name='encargos'
    )
    descripcion_requerimientos = models.TextField()
    archivo_referencia = models.FileField(upload_to='referencias_encargos/', null=True, blank=True)
    estado_encargo = models.CharField(
        max_length=20, 
        choices=EstadoEncargo.choices, 
        default=EstadoEncargo.SOLICITADO
    )
    fecha_entrega_estimada = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Encargo Personalizado"
        verbose_name_plural = "Encargos Personalizados"

    def __str__(self):
        return f"Encargo #{self.id} - {self.usuario.nombre}"


# ------------------------------------------------------------------------------
# 7. CHAT Y MENSAJERÍA (SOPORTE INTERNO)
# ------------------------------------------------------------------------------

class Conversacion(models.Model):
    usuario = models.ForeignKey(
        Usuario, 
        on_delete=models.CASCADE, 
        related_name='conversaciones'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_ultima_actividad = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Conversación"
        verbose_name_plural = "Conversaciones"

    def __str__(self):
        return f"Conversación #{self.id} con {self.usuario.nombre}"


class Mensaje(models.Model):
    conversacion = models.ForeignKey(
        Conversacion, 
        on_delete=models.CASCADE, 
        related_name='mensajes'
    )
    remitente = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    contenido = models.TextField()
    fecha_envio = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Mensaje"
        verbose_name_plural = "Mensajes"

    def __str__(self):
        return f"Mensaje de {self.remitente.nombre} en Conv #{self.conversacion.id}"