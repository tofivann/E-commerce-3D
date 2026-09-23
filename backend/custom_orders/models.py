from django.db import models
from users.models import Usuario
from orders.models import Orden


class EstadoComision(models.TextChoices):
    # Estado inicial, transitorio: existe solo entre que se crea la comisión
    # y que el pago se confirma (segundos, o para siempre si el cliente
    # nunca paga). Al confirmarse el pago pasa solo a EN_PROCESO
    # (services.py), así que una comisión pagada nunca se ve en este estado;
    # el frontend lo muestra como "Confirmando pago", no como "en cola".
    SOLICITADO = 'SOLICITADO', 'Solicitado'
    EN_PROCESO = 'EN_PROCESO', 'En Proceso'
    COMPLETADO = 'COMPLETADO', 'Completado'
    CANCELADO = 'CANCELADO', 'Cancelado'


class TramoPersonajesMotion(models.Model):
    """Tramo de cantidad de personajes con su precio fijo para una comisión de Motion."""
    nombre = models.CharField(max_length=50, help_text="Ej: 'Characters'")
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
        #prueba

    def __str__(self):
        return f"{self.nombre} - ${self.precio}"


class DatosPublicacion(models.Model):
    """
    Datos de reventa que el admin llena al subir la entrega (en el mismo
    modal que archivo/foto/categorías): son los campos del Producto que se
    creará si la comisión se publica en la tienda. _publicar_producto los
    lee de aquí, por eso publicar ya no pide ningún formulario aparte.

    Todos opcionales al guardar (se pueden completar en otro momento desde
    el mismo modal); se exigen recién al publicar — ver
    `publicacion_completa`. Abstracto: ComisionMotion y ComisionModelo lo
    heredan sin cambios. Son campos del admin: no se exponen al cliente,
    que sigue viendo su comisión con el nombre que él mismo pidió.
    """
    titulo_publicacion = models.CharField(max_length=200, blank=True)
    descripcion_publicacion = models.TextField(blank=True)
    precio_publicacion = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    formato_archivo_publicacion = models.CharField(max_length=50, blank=True, help_text="Ej: STL, OBJ, FBX")
    # Mismo nombre y definición que Producto.link_youtube: se copia tal cual
    # al publicar. Distinto de ComisionMotion.link_video, que es el video de
    # REFERENCIA que manda el cliente al pedir la comisión.
    link_youtube = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Link de YouTube con un video del resultado (opcional). Se copia al Producto al publicar.",
    )

    class Meta:
        abstract = True

    @property
    def publicacion_completa(self):
        """True si ya están los datos mínimos para crear el Producto (todo lo
        que en Producto es obligatorio). link_youtube es opcional también ahí."""
        return bool(
            self.titulo_publicacion
            and self.descripcion_publicacion
            and self.precio_publicacion is not None
            and self.formato_archivo_publicacion
        )


class ComisionMotion(DatosPublicacion):
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
    # Foto del resultado terminado, subida por el admin junto con archivo_entrega y
    # categoria al completar la comisión — mismo patrón que ComisionModelo.foto_entrega.
    foto_entrega = models.ImageField(upload_to='comisiones/motion/entrega/', null=True, blank=True)
    # Igual que Producto.categorias: varias categorías por comisión. Opcional
    # (blank=True) hasta que se completa la entrega — ver ValidacionEntregaMixin.
    categorias = models.ManyToManyField('products.Categoria', related_name='comisiones_motion', blank=True)
    # Se completa al publicar el Producto derivado de esta comisión en el catálogo.
    producto_publicado = models.ForeignKey(
        'products.Producto', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='comision_motion_origen',
    )

    class Meta:
        verbose_name = "Comisión de Motion"
        verbose_name_plural = "Comisiones de Motion"

    def __str__(self):
        return f"Motion #{self.id} - {self.usuario.nombre} - {self.nombre_cancion}"


class ComisionModelo(DatosPublicacion):
    """Comisión de un modelo 3D nuevo (personaje que aún no está en la tienda)."""
    orden = models.OneToOneField(Orden, on_delete=models.CASCADE, related_name='comision_modelo')
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='comisiones_modelo')
    juego = models.ForeignKey(JuegoComision, on_delete=models.PROTECT)
    nombre_personaje = models.CharField(max_length=150)
    foto_referencia_1 = models.ImageField(upload_to='comisiones/modelo/referencias/')
    foto_referencia_2 = models.ImageField(upload_to='comisiones/modelo/referencias/', null=True, blank=True)
    estado = models.CharField(max_length=20, choices=EstadoComision.choices, default=EstadoComision.SOLICITADO)
    archivo_entrega = models.FileField(upload_to='comisiones/modelo/', null=True, blank=True)
    # Foto del modelo ya terminado, subida por el admin junto con archivo_entrega al
    # completar la comisión (distinta de foto_referencia_1/2, que sube el cliente al
    # pedirla). Se reutiliza como imagen_previa al publicar el Producto en la tienda.
    foto_entrega = models.ImageField(upload_to='comisiones/modelo/entrega/', null=True, blank=True)
    # Igual que Producto.categorias: varias categorías por comisión. Opcional
    # (blank=True) hasta que se completa la entrega — ver ValidacionEntregaMixin.
    categorias = models.ManyToManyField('products.Categoria', related_name='comisiones_modelo', blank=True)
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
