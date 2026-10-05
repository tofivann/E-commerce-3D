"""Miniaturas automáticas para los modelos que guardan imágenes.

Las imágenes que se suben (portadas de producto, fotos de comisiones) pesan
alrededor de 1 MB, y bajarlas enteras para verlas en una tarjeta hacía lentas
las listas. Un modelo que hereda de `ConMiniaturas` declara qué campo de
imagen tiene qué campo de miniatura, y a partir de ahí la miniatura se
mantiene sola al guardar:

    class Producto(ConMiniaturas):
        MINIATURAS = {'imagen_previa': 'imagen_miniatura'}
        imagen_previa = models.ImageField(...)
        imagen_miniatura = models.ImageField(..., editable=False)

Las filas anteriores a la miniatura se completan con
`python manage.py generar_miniaturas`, que recorre todos estos modelos.
"""
from django.db import models

from core.imagenes import ImagenInvalida, crear_miniatura

# Lado mayor de una miniatura, en px. La tarjeta más grande mide ~320 px de
# ancho; el doble cubre las pantallas de alta densidad.
LADO_MINIATURA = 640


class ConMiniaturas(models.Model):
    # {campo de imagen original: campo donde va su miniatura}
    MINIATURAS = {}

    class Meta:
        abstract = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._recordar_originales()

    def _recordar_originales(self):
        """Anota con qué imagen original se cargó cada campo: save() lo
        compara con el actual para saber si hay que rehacer la miniatura.
        None si la columna no se cargó (.only()/.defer())."""
        sin_cargar = self.get_deferred_fields()
        self._originales_cargados = {
            origen: None if origen in sin_cargar else getattr(self, origen).name
            for origen in self.MINIATURAS
        }

    def _miniatura_desactualizada(self, origen):
        original = getattr(self, origen)
        miniatura = getattr(self, self.MINIATURAS[origen])
        if not original:
            return bool(miniatura)                      # se quitó la imagen
        if not miniatura:
            return True                                 # imagen sin miniatura
        if not original._committed:
            return True                                 # se acaba de subir otra
        cargado = self._originales_cargados.get(origen)
        return cargado is not None and original.name != cargado

    def generar_miniatura(self, origen):
        """Rehace la miniatura del campo `origen`, sin guardar la fila.
        Devuelve el nombre del archivo de la miniatura anterior (o None),
        que el llamador borra del disco una vez guardada la fila.

        Una imagen ilegible no impide guardar: el campo se queda sin
        miniatura y quien la muestre usa la imagen original.
        """
        destino = self.MINIATURAS[origen]
        original = getattr(self, origen)
        anterior = getattr(self, destino).name or None
        setattr(self, destino, None)
        if original:
            try:
                miniatura = crear_miniatura(original.file, LADO_MINIATURA)
                getattr(self, destino).save(miniatura.name, miniatura, save=False)
            except (ImagenInvalida, OSError) as e:
                # Sin acentos: la consola del servidor puede estar en ASCII.
                print(f"No se pudo crear la miniatura de {self._meta.label} {self.pk} ({origen}): {e}")
            finally:
                if not original._committed:
                    # Recién subida: todavía tiene que guardarse entera.
                    original.file.seek(0)
                else:
                    original.close()
        return anterior

    def save(self, *args, **kwargs):
        # Cada miniatura sigue a su imagen. Si el llamador no está guardando
        # esa imagen (update_fields sin ella), tampoco se toca su miniatura.
        update_fields = kwargs.get('update_fields')
        anteriores = {}
        for origen, destino in self.MINIATURAS.items():
            guarda_original = update_fields is None or origen in update_fields
            if guarda_original and self._miniatura_desactualizada(origen):
                anteriores[destino] = self.generar_miniatura(origen)
        if update_fields is not None and anteriores:
            kwargs['update_fields'] = set(update_fields) | set(anteriores)

        super().save(*args, **kwargs)

        self._recordar_originales()
        for destino, anterior in anteriores.items():
            actual = getattr(self, destino)
            if anterior and anterior != actual.name:
                actual.storage.delete(anterior)
