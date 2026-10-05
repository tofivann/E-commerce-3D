from django.conf import settings
from django.db import models

from core.imagenes import ImagenInvalida, crear_miniatura
from core.text_utils import normalizar_texto

# Lado mayor de la miniatura de un producto, en px. La tarjeta más grande
# mide ~320 px de ancho; el doble cubre las pantallas de alta densidad.
LADO_MINIATURA = 640


# Categorías principales del negocio (las que crea la migración 0004). No se
# pueden editar ni borrar desde la API: clasifican casi todo el catálogo y
# el modal de entrega de comisiones las busca por nombre para premarcarlas.
# Se identifican por nombre a propósito — como no se pueden renombrar, el
# nombre es estable, y así no hace falta una columna ni una migración.
NOMBRES_CATEGORIAS_PROTEGIDAS = frozenset({'Modelo', 'Motion', 'Juego'})


class Categoria(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    nombre_en = models.CharField(max_length=100, help_text="Nombre en inglés, para el sitio en modo EN.")
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"
        ordering = ['nombre']

    def __str__(self):
        return self.nombre

    @property
    def protegida(self):
        return self.nombre in NOMBRES_CATEGORIAS_PROTEGIDAS


class Producto(models.Model):
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    # Un producto puede pertenecer a varias categorías a la vez (ej. un modelo
    # que también es de Motion). Debe tener al menos una — eso se exige en el
    # serializer (allow_empty=False), no a nivel de base de datos, ya que un
    # ManyToManyField no admite una restricción NOT NULL como un FK.
    categorias = models.ManyToManyField(Categoria, related_name='productos')
    formato_archivo = models.CharField(max_length=50, help_text="Ej: STL, OBJ, FBX")
    archivo_3d = models.FileField(upload_to='modelos_3d/')
    imagen_previa = models.ImageField(
        upload_to='productos_preview/',
        null=True,
        blank=True,
        help_text="Imagen de previsualización del producto."
    )
    # Copia ligera de imagen_previa (WebP, LADO_MINIATURA px) para las tarjetas
    # y listas: la portada original pesa ~1 MB y bajarla entera para verla en
    # pequeño hacía lento el catálogo. La mantiene save(); no se edita a mano.
    imagen_miniatura = models.ImageField(
        upload_to='productos_miniaturas/',
        null=True,
        blank=True,
        editable=False,
        help_text="Miniatura de la imagen de previsualización; se genera sola.",
    )
    link_youtube = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Link de YouTube con un video de vista previa del modelo (opcional)."
    )
    activo = models.BooleanField(default=True, db_index=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    # Copias de titulo/descripcion sin acentos y en minúsculas, mantenidas en
    # save(). La búsqueda del catálogo (?search=) filtra sobre estas columnas
    # para ser insensible a acentos en cualquier base de datos: `icontains`
    # de Postgres ignora mayúsculas pero no acentos, y la extensión `unaccent`
    # no existe en el SQLite de desarrollo. No se editan a mano.
    titulo_normalizado = models.CharField(max_length=200, default='', editable=False, db_index=True)
    descripcion_normalizada = models.TextField(default='', editable=False)

    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"
        # Orden determinista: obligatorio para paginar (sin él, Postgres puede
        # repetir o saltar filas entre páginas). Lo más nuevo primero.
        ordering = ['-fecha_creacion', '-id']

    def __str__(self):
        return self.titulo

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Portada con que se cargó esta instancia: save() la compara con la
        # actual para saber si hay que rehacer la miniatura. None si la
        # columna no se cargó (.only()/.defer()).
        cargada = 'imagen_previa' not in self.get_deferred_fields()
        self._portada_cargada = self.imagen_previa.name if cargada else None

    def _miniatura_desactualizada(self):
        portada = self.imagen_previa
        if not portada:
            return bool(self.imagen_miniatura)          # se quitó la portada
        if not self.imagen_miniatura:
            return True                                 # portada sin miniatura
        if not portada._committed:
            return True                                 # se acaba de subir otra
        return self._portada_cargada is not None and portada.name != self._portada_cargada

    def generar_miniatura(self):
        """Rehace `imagen_miniatura` a partir de `imagen_previa`, sin guardar
        la fila. Devuelve el nombre de la miniatura anterior (o None), que el
        llamador borra del disco una vez guardada la fila.

        Una portada ilegible no impide guardar el producto: se queda sin
        miniatura y las tarjetas usan la portada original.
        """
        anterior = self.imagen_miniatura.name or None
        self.imagen_miniatura = None
        if self.imagen_previa:
            try:
                miniatura = crear_miniatura(self.imagen_previa.file, LADO_MINIATURA)
                self.imagen_miniatura.save(miniatura.name, miniatura, save=False)
            except (ImagenInvalida, OSError) as e:
                print(f"No se pudo crear la miniatura del producto {self.pk}: {e}")
            finally:
                # Una portada recién subida todavía tiene que guardarse entera.
                if not self.imagen_previa._committed:
                    self.imagen_previa.file.seek(0)
                else:
                    self.imagen_previa.close()
        return anterior

    def save(self, *args, **kwargs):
        self.titulo_normalizado = normalizar_texto(self.titulo)
        self.descripcion_normalizada = normalizar_texto(self.descripcion)
        # Si el llamador limitó las columnas a escribir (update_fields), las
        # normalizadas tienen que ir incluidas o quedarían desactualizadas.
        update_fields = kwargs.get('update_fields')
        if update_fields is not None:
            kwargs['update_fields'] = set(update_fields) | {'titulo_normalizado', 'descripcion_normalizada'}

        # La miniatura sigue a la portada. Si el llamador no está guardando
        # la portada (update_fields sin ella), tampoco se toca la miniatura.
        miniatura_anterior = None
        guarda_portada = update_fields is None or 'imagen_previa' in update_fields
        rehacer = guarda_portada and self._miniatura_desactualizada()
        if rehacer:
            miniatura_anterior = self.generar_miniatura()
            if update_fields is not None:
                kwargs['update_fields'] |= {'imagen_miniatura'}

        super().save(*args, **kwargs)

        self._portada_cargada = self.imagen_previa.name
        if miniatura_anterior and miniatura_anterior != self.imagen_miniatura.name:
            self.imagen_miniatura.storage.delete(miniatura_anterior)


class Favorito(models.Model):
    """Producto que un usuario guardó con el corazón del catálogo.

    No es una compra ni da ningún derecho sobre el producto: es solo una
    marca personal. Por eso ambos FK son CASCADE — al borrar el producto (o
    la cuenta) el favorito desaparece sin bloquear nada, al revés que
    orders.ComprasDigitales, que protege al producto comprado.
    """
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favoritos',
    )
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='favoritos')
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Favorito"
        verbose_name_plural = "Favoritos"
        ordering = ['-fecha_creacion', '-id']
        constraints = [
            # Un producto no puede estar dos veces en la lista de un usuario.
            models.UniqueConstraint(fields=['usuario', 'producto'], name='uniq_favorito_usuario_producto'),
        ]

    def __str__(self):
        return f"{self.usuario} ♥ {self.producto}"
