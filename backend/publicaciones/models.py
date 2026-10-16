"""Novedades: publicaciones de la dueña (texto, fotos y un video de YouTube)
que los clientes con acceso pueden comentar.

El video no se sube al servidor a propósito: cada archivo lo serviría Django
con uno de los pocos trabajadores del hosting y no hay transcodificación ni
streaming adaptativo. Se pega el enlace de YouTube (puede ser "no listado")
y se muestra con el mismo reproductor que usan productos y comisiones.
"""
from django.conf import settings
from django.db import models

from core.miniaturas import ConMiniaturas


class Publicacion(models.Model):
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='publicaciones',
        verbose_name='autor',
    )
    titulo = models.CharField('título', max_length=200)
    texto = models.TextField('texto', blank=True)
    link_youtube = models.URLField('video de YouTube', blank=True)
    # Un borrador (publicado=False) solo lo ve el staff.
    publicado = models.BooleanField('publicado', default=True)
    fecha_creacion = models.DateTimeField('fecha de creación', auto_now_add=True)
    fecha_actualizacion = models.DateTimeField('última edición', auto_now=True)

    class Meta:
        verbose_name = 'publicación'
        verbose_name_plural = 'publicaciones'
        # Orden fijo: la lista va paginada (ver products.Producto).
        ordering = ['-fecha_creacion', '-id']

    def __str__(self):
        return self.titulo


class FotoPublicacion(ConMiniaturas):
    MINIATURAS = {'imagen': 'imagen_miniatura'}

    publicacion = models.ForeignKey(Publicacion, on_delete=models.CASCADE, related_name='fotos')
    imagen = models.ImageField('imagen', upload_to='publicaciones/')
    imagen_miniatura = models.ImageField(
        upload_to='publicaciones/miniaturas/',
        null=True,
        blank=True,
        editable=False,
        help_text="Miniatura de la imagen; se genera sola.",
    )
    orden = models.PositiveSmallIntegerField('orden', default=0)

    class Meta:
        verbose_name = 'foto de publicación'
        verbose_name_plural = 'fotos de publicación'
        ordering = ['orden', 'id']

    def __str__(self):
        return f'Foto {self.pk} de "{self.publicacion}"'


class Comentario(models.Model):
    publicacion = models.ForeignKey(Publicacion, on_delete=models.CASCADE, related_name='comentarios')
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comentarios_publicaciones',
        verbose_name='usuario',
    )
    texto = models.TextField('texto', max_length=2000)
    fecha_creacion = models.DateTimeField('fecha', auto_now_add=True)

    class Meta:
        verbose_name = 'comentario'
        verbose_name_plural = 'comentarios'
        # Un hilo plano, del más antiguo al más nuevo.
        ordering = ['fecha_creacion', 'id']

    def __str__(self):
        return f'{self.usuario} en "{self.publicacion}"'
