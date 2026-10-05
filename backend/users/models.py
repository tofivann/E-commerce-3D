from django.db import models
from django.contrib.auth.models import AbstractUser

from core.idiomas import IDIOMA_POR_DEFECTO, OPCIONES_IDIOMA

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
    idioma = models.CharField(
        max_length=2,
        choices=OPCIONES_IDIOMA,
        default=IDIOMA_POR_DEFECTO,
        help_text=(
            "Idioma en que el usuario usa el sitio; en él se le escriben los correos. "
            "Se actualiza solo (users/authentication.py), no se edita a mano."
        ),
    )
    foto_perfil = models.ImageField(
        upload_to='perfiles/', null=True, blank=True,
        help_text="Foto de perfil, ya recortada y reducida (ver users/perfil.py).",
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

    @property
    def tiene_acceso_al_catalogo(self):
        """Puede ver el catálogo desbloqueado: staff, o cuenta con la
        suscripción activa. Es la misma regla que `hasAccess` en el frontend
        (isStaff || estado_suscripcion === 'ACTIVO')."""
        return self.is_staff or self.estado_suscripcion == self.EstadoSuscripcion.ACTIVO
