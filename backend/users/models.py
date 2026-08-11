from django.db import models
from django.contrib.auth.models import AbstractUser

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
