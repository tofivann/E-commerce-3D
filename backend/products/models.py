from django.db import models

class Producto(models.Model):
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    formato_archivo = models.CharField(max_length=50, help_text="Ej: STL, OBJ, FBX")
    archivo_3d = models.FileField(upload_to='modelos_3d/')
    imagen_previa = models.ImageField(
        upload_to='productos_preview/',
        null=True,
        blank=True,
        help_text="Imagen de previsualización del producto."
    )
    activo = models.BooleanField(default=True, db_index=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"

    def __str__(self):
        return self.titulo
