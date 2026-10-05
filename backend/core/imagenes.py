"""Tratamiento de las imágenes que se suben al sitio (Pillow).

Dos usos hoy, que comparten cómo se abre una imagen con seguridad:
  - la foto de perfil (users/perfil.py), que se guarda ya recortada;
  - la miniatura de un producto (products/models.py), una copia ligera de
    la portada para las tarjetas del catálogo.
"""
import uuid
from io import BytesIO

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

# Tope de píxeles que se acepta decodificar: una foto de móvil ronda 12-50 MP.
# Por encima, una imagen pequeña en disco puede ocupar gigas en memoria.
PIXELES_MAXIMOS = 40_000_000

# Errores con que Pillow avisa de un archivo que no es una imagen usable.
ERRORES_PILLOW = (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError)


class ImagenInvalida(Exception):
    """El archivo no es una imagen que se pueda leer."""


class ImagenDemasiadoGrande(ImagenInvalida):
    """La imagen supera el tope de píxeles."""


def abrir_imagen(archivo, pixeles_maximos=PIXELES_MAXIMOS):
    """Abre `archivo` y devuelve la imagen ya decodificada y derecha.

    "Derecha": los móviles guardan la foto acostada y anotan el giro en los
    metadatos (EXIF); aquí se aplica ese giro, porque lo que se guarda
    después no conserva los metadatos. Lanza `ImagenInvalida`.
    """
    try:
        archivo.seek(0)
        imagen = Image.open(archivo)
        if imagen.width * imagen.height > pixeles_maximos:
            raise ImagenDemasiadoGrande()
        return ImageOps.exif_transpose(imagen)
    except ImagenInvalida:
        raise
    except ERRORES_PILLOW as e:
        raise ImagenInvalida(str(e)) from e


def crear_miniatura(archivo, lado_maximo, calidad=80):
    """Copia reducida de una imagen, en WebP, que cabe en un cuadrado de
    `lado_maximo` px sin deformarse ni recortarse (una que ya es más pequeña
    no se agranda). Conserva la transparencia. Devuelve un ContentFile con
    nombre al azar; lanza `ImagenInvalida` si el archivo no se puede leer.

    WebP porque pesa bastante menos que JPEG o PNG a la misma calidad y lo
    muestran todos los navegadores actuales.
    """
    imagen = abrir_imagen(archivo)
    try:
        tiene_transparencia = imagen.mode in ('RGBA', 'LA', 'PA') or 'transparency' in imagen.info
        imagen = imagen.convert('RGBA' if tiene_transparencia else 'RGB')
        imagen.thumbnail((lado_maximo, lado_maximo), Image.Resampling.LANCZOS)
        salida = BytesIO()
        imagen.save(salida, format='WEBP', quality=calidad, method=4)
    except ERRORES_PILLOW as e:
        raise ImagenInvalida(str(e)) from e
    return ContentFile(salida.getvalue(), name=f'{uuid.uuid4().hex}.webp')
