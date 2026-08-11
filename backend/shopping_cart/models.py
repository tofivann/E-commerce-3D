from django.db import models
from users.models import Usuario
from products.models import Producto

class Carrito(models.Model):
    usuario = models.OneToOneField(
        Usuario, 
        on_delete=models.CASCADE, 
        related_name='carrito'
    )
    # Relación M:N explícita usando CarritoItem como tabla intermedia
    productos = models.ManyToManyField(Producto, through='CarritoItem', related_name='carritos')
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Carrito"
        verbose_name_plural = "Carritos"

    def __str__(self):
        return f"Carrito de {self.usuario.nombre}"


class CarritoItem(models.Model):
    carrito = models.ForeignKey(
        Carrito, 
        on_delete=models.CASCADE, 
        related_name='items'
    )
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)

    class Meta:
        verbose_name = "Ítem de Carrito"
        verbose_name_plural = "Ítems de Carrito"
        unique_together = ('carrito', 'producto')  # Evita duplicar el mismo modelo en el carrito

    def __str__(self):
        return f"{self.producto.titulo} en carrito de {self.carrito.usuario.nombre}"
