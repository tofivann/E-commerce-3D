"""Foto de perfil: límites y preparación de la imagen que sube el usuario.

La foto se guarda SIEMPRE ya recortada a cuadrado, reducida y en JPEG, con
un nombre al azar: así la miniatura de la cabecera pesa pocos KB aunque el
usuario suba una foto de 5 MB del móvil, no se conserva el nombre original
del archivo (ni sus metadatos: ubicación GPS, modelo de cámara...) y la
dirección de la foto no se puede adivinar a partir del usuario.
"""
import uuid
from io import BytesIO

from django.core.files.base import ContentFile
from PIL import Image, ImageOps
from rest_framework import serializers

from core.imagenes import ERRORES_PILLOW, ImagenDemasiadoGrande, ImagenInvalida, abrir_imagen

CARPETA_FOTOS_PERFIL = 'perfiles/'
TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024       # 5 MB, lo que se le dice al usuario
LADO_FOTO = 400                            # px; de sobra para el perfil y la cabecera


def preparar_foto_perfil(archivo):
    """Valida la imagen subida y devuelve un ContentFile JPEG cuadrado de
    LADO_FOTO px, listo para asignar a `Usuario.foto_perfil`."""
    if archivo.size > TAMANO_MAXIMO_FOTO:
        raise serializers.ValidationError('La foto no puede pesar más de 5 MB.')
    try:
        imagen = abrir_imagen(archivo)
        if imagen.mode in ('RGBA', 'LA', 'P'):
            # JPEG no tiene transparencia: se pone sobre fondo blanco.
            imagen = imagen.convert('RGBA')
            fondo = Image.new('RGB', imagen.size, (255, 255, 255))
            fondo.paste(imagen, mask=imagen.split()[-1])
            imagen = fondo
        else:
            imagen = imagen.convert('RGB')
        # Recorte centrado a cuadrado + reducción.
        imagen = ImageOps.fit(imagen, (LADO_FOTO, LADO_FOTO), Image.Resampling.LANCZOS)
    except ImagenDemasiadoGrande:
        raise serializers.ValidationError('La foto es demasiado grande. Usa una de menor resolución.')
    except (ImagenInvalida, *ERRORES_PILLOW):
        raise serializers.ValidationError('El archivo no es una imagen válida.')

    salida = BytesIO()
    imagen.save(salida, format='JPEG', quality=85, optimize=True)
    return ContentFile(salida.getvalue(), name=f'{uuid.uuid4().hex}.jpg')

