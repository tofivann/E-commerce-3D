from django.db import models
from django.contrib.auth.models import AbstractUser


# ------------------------------------------------------------------------------
# 1. USUARIOS Y PERFILES (HERENCIA 1:1)
# ------------------------------------------------------------------------------

class Usuario(AbstractUser):
    nombre = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'nombre']

    def __str__(self):
        return f"{self.nombre} ({self.email})"


class Administrador(models.Model):
    usuario = models.OneToOneField(
        Usuario, 
        on_delete=models.CASCADE, 
        primary_key=True, 
        related_name='perfil_admin'
    )
    nivel_acceso = models.CharField(max_length=50, default='General')

    class Meta:
        verbose_name = "Administrador"
        verbose_name_plural = "Administradores"

    def __str__(self):
        return f"Admin: {self.usuario.nombre}"


class Cliente(models.Model):
    usuario = models.OneToOneField(
        Usuario, 
        on_delete=models.CASCADE, 
        primary_key=True, 
        related_name='perfil_cliente'
    )
    estado_suscripcion = models.CharField(max_length=50, default='Inactivo')

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"

    def __str__(self):
        return f"Cliente: {self.usuario.nombre}"


# ------------------------------------------------------------------------------
# 2. CATÁLOGO DE PRODUCTOS (MODELOS 3D)
# ------------------------------------------------------------------------------

class Producto(models.Model):
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    formato_archivo = models.CharField(max_length=50, help_text="Ej: STL, OBJ, FBX")
    archivo_3d = models.FileField(upload_to='modelos_3d/')
    imagen_previa = models.URLField(max_length=500, null=True, blank=True, help_text="URL de la imagen de previsualización")
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"

    def __str__(self):
        return self.titulo


# ------------------------------------------------------------------------------
# 3. CARRITO DE COMPRAS
# ------------------------------------------------------------------------------

class Carrito(models.Model):
    cliente = models.OneToOneField(
        Cliente, 
        on_delete=models.CASCADE, 
        related_name='carrito'
    )
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Carrito"
        verbose_name_plural = "Carritos"

    def __str__(self):
        return f"Carrito de {self.cliente.usuario.nombre}"


class CarritoItem(models.Model):
    carrito = models.ForeignKey(
        Carrito, 
        on_delete=models.CASCADE, 
        related_name='items'
    )
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(default=1)

    class Meta:
        verbose_name = "Ítem de Carrito"
        verbose_name_plural = "Ítems de Carrito"
        unique_together = ('carrito', 'producto')

    def __str__(self):
        return f"{self.cantidad}x {self.producto.titulo}"


# ------------------------------------------------------------------------------
# 4. ÓRDENES Y DETALLES
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
    cliente = models.ForeignKey(
        Cliente, 
        on_delete=models.CASCADE, 
        related_name='ordenes'
    )
    total = models.DecimalField(max_digits=10, decimal_places=2)
    estado_pago = models.CharField(
        max_length=20, 
        choices=EstadoPago.choices, 
        default=EstadoPago.PENDIENTE
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
        return f"Orden {self.codigo_orden} - {self.cliente.usuario.nombre}"


class DetalleOrden(models.Model):
    orden = models.ForeignKey(
        Orden, 
        on_delete=models.CASCADE, 
        related_name='detalles'
    )
    producto = models.ForeignKey(Producto, on_delete=models.SET_NULL, null=True)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = "Detalle de Orden"
        verbose_name_plural = "Detalles de Órdenes"

    def __str__(self):
        return f"{self.producto.titulo if self.producto else 'Producto Eliminado'} (${self.precio_unitario})"


# ------------------------------------------------------------------------------
# 5. COMPRAS DIGITALES (PERMISOS DE DESCARGA / HISTORIAL ADQUIRIDO)
# ------------------------------------------------------------------------------

class ComprasDigitales(models.Model):
    cliente = models.ForeignKey(
        Cliente, 
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
        help_text="Orden de compra que originó este registro."
    )
    activo = models.BooleanField(
        default=True, 
        help_text="Indica si el cliente conserva el acceso para descargar el archivo."
    )
    fecha_adquisicion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'compras_digitales'
        verbose_name = "Compra Digital"
        verbose_name_plural = "Compras Digitales"
        unique_together = ('cliente', 'producto', 'orden')

    def __str__(self):
        estado_str = "Activo" if self.activo else "Inactivo"
        return f"{self.cliente.usuario.nombre} - {self.producto.titulo} [{estado_str}]"


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
    cliente = models.ForeignKey(
        Cliente, 
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
        return f"Encargo #{self.id} - {self.cliente.usuario.nombre}"


# ------------------------------------------------------------------------------
# 7. CHAT Y MENSAJERÍA
# ------------------------------------------------------------------------------

class Conversacion(models.Model):
    cliente = models.ForeignKey(
        Cliente, 
        on_delete=models.CASCADE, 
        related_name='conversaciones'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_ultima_actividad = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Conversación"
        verbose_name_plural = "Conversaciones"

    def __str__(self):
        return f"Conversación #{self.id} con {self.cliente.usuario.nombre}"


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