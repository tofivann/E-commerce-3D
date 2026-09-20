from django.db import models

from core.text_utils import normalizar_texto


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

    def save(self, *args, **kwargs):
        self.titulo_normalizado = normalizar_texto(self.titulo)
        self.descripcion_normalizada = normalizar_texto(self.descripcion)
        # Si el llamador limitó las columnas a escribir (update_fields), las
        # normalizadas tienen que ir incluidas o quedarían desactualizadas.
        update_fields = kwargs.get('update_fields')
        if update_fields is not None:
            kwargs['update_fields'] = set(update_fields) | {'titulo_normalizado', 'descripcion_normalizada'}
        super().save(*args, **kwargs)
