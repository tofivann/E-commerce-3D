from django.db import models
from users.models import Usuario
from orders.models import Orden


class EstadoComision(models.TextChoices):
    SOLICITADO = 'SOLICITADO', 'Solicitado'  # ya pagado, en cola de trabajo
    EN_PROCESO = 'EN_PROCESO', 'En Proceso'
    COMPLETADO = 'COMPLETADO', 'Completado'
    CANCELADO = 'CANCELADO', 'Cancelado'


class TramoPersonajesMotion(models.Model):
    """Tramo de cantidad de personajes con su precio fijo para una comisión de Motion."""
    nombre = models.CharField(max_length=50, help_text="Ej: '1-3 Characters'")
    min_personajes = models.PositiveIntegerField()
    max_personajes = models.PositiveIntegerField()
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    activo = models.BooleanField(default=True)
    orden_visualizacion = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Tramo de Personajes (Motion)"
        verbose_name_plural = "Tramos de Personajes (Motion)"
        ordering = ['orden_visualizacion', 'min_personajes']

    def __str__(self):
        return f"{self.nombre} - ${self.precio}"


class JuegoComision(models.Model):
    """Juego disponible para pedir una Comisión de Modelo Nuevo, con su precio fijo."""
    nombre = models.CharField(max_length=100, unique=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Juego (Comisión de Modelo)"
        verbose_name_plural = "Juegos (Comisión de Modelo)"
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} - ${self.precio}"


class ComisionMotion(models.Model):
    """Comisión de coreografía/animación sobre un personaje que el cliente ya tiene."""
    orden = models.OneToOneField(Orden, on_delete=models.CASCADE, related_name='comision_motion')
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='comisiones_motion')
    tramo_personajes = models.ForeignKey(TramoPersonajesMotion, on_delete=models.PROTECT)
    nombre_juego = models.CharField(max_length=150)
    nombre_cancion = models.CharField(max_length=150)
    link_video = models.URLField(max_length=500, help_text="Video de referencia de la coreografía/canción.")
    informacion_adicional = models.TextField(blank=True)
    estado = models.CharField(max_length=20, choices=EstadoComision.choices, default=EstadoComision.SOLICITADO)
    archivo_entrega = models.FileField(upload_to='comisiones/motion/', null=True, blank=True)

    class Meta:
        verbose_name = "Comisión de Motion"
        verbose_name_plural = "Comisiones de Motion"

    def __str__(self):
        return f"Motion #{self.id} - {self.usuario.nombre} - {self.nombre_cancion}"


class ComisionModelo(models.Model):
    """Comisión de un modelo 3D nuevo (personaje que aún no está en la tienda)."""
    orden = models.OneToOneField(Orden, on_delete=models.CASCADE, related_name='comision_modelo')
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='comisiones_modelo')
    juego = models.ForeignKey(JuegoComision, on_delete=models.PROTECT)
    nombre_personaje = models.CharField(max_length=150)
    foto_referencia_1 = models.ImageField(upload_to='comisiones/modelo/referencias/')
    foto_referencia_2 = models.ImageField(upload_to='comisiones/modelo/referencias/', null=True, blank=True)
    estado = models.CharField(max_length=20, choices=EstadoComision.choices, default=EstadoComision.SOLICITADO)
    archivo_entrega = models.FileField(upload_to='comisiones/modelo/', null=True, blank=True)
    # Se completa al publicar el Producto derivado de esta comisión en el catálogo.
    producto_publicado = models.ForeignKey(
        'products.Producto', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='comision_origen',
    )

    class Meta:
        verbose_name = "Comisión de Modelo Nuevo"
        verbose_name_plural = "Comisiones de Modelo Nuevo"

    def __str__(self):
        return f"Modelo #{self.id} - {self.usuario.nombre} - {self.nombre_personaje}"
