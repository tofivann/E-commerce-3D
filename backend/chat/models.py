#chat/models
from django.db import models
from users.models import Usuario

class Conversacion(models.Model):
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        related_name='conversaciones',
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_ultima_actividad = models.DateTimeField(auto_now=True)
    
    #  Nuevos campos para control de lectura
    admin_ultimo_leido = models.DateTimeField(null=True, blank=True)
    cliente_ultimo_leido = models.DateTimeField(null=True, blank=True)

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