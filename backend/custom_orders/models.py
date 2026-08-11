from django.db import models
from users.models import Usuario
from orders.models import Orden

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
    
    # CAMBIO: URLField para enlaces de Google Drive, Dropbox, Figma, etc.
    archivo_referencia = models.URLField(
        max_length=500, 
        null=True, 
        blank=True, 
        help_text="Enlace externo a Google Drive, Dropbox o carpeta de imágenes con la referencia."
    )
    
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