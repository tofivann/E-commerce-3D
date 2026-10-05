from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.utils import datetime_from_epoch
from core.idiomas import IDIOMA_POR_DEFECTO
from .models import Usuario
from .perfil import preparar_foto_perfil
from .tokens import (
    CLAIM_REMEMBER_ME,
    DURACION_SESION_CORTA,
    crear_refresh_token,
    datos_usuario_para_login,
)
from .verificacion import CodigoInvalido, LONGITUD_CODIGO, comprobar_codigo, consumir_codigo, normalizar_correo

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'nombre', 'rol', 'estado_suscripcion', 'is_active',
            'fecha_registro', 'password', 'foto_perfil',
        ]
        # foto_perfil: solo lectura aquí. La cambia cada usuario desde su
        # perfil (MiPerfilSerializer), no el admin desde la tabla de usuarios.
        read_only_fields = ['fecha_registro', 'foto_perfil']
        extra_kwargs = {
            # 'write_only': True evita que el password viaje en la respuesta JSON al consultar
            'password': {'write_only': True, 'required': True}
        }

    # Sobrescribimos el método create para encriptar la contraseña correctamente
    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data['is_staff'] = validated_data.get('rol') == Usuario.Rol.ADMIN
        user = Usuario.objects.create_user(password=password, **validated_data)
        return user

    def update(self, instance, validated_data):
        # Si la petición incluye un nuevo password, lo extraemos y encriptamos
        password = validated_data.pop('password', None)

        # rol es el único control que expone este formulario para dar acceso de
        # administrador — is_staff (lo que realmente habilita /admin y el panel
        # admin del sitio) no es un campo editable aparte, así que se mantiene
        # sincronizado con rol en cada guardado.
        if 'rol' in validated_data:
            instance.is_staff = validated_data['rol'] == Usuario.Rol.ADMIN

        # Actualizamos los demás campos (username, email, etc.)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Si se envió un nuevo password, usamos set_password para encriptarlo
        if password:
            instance.set_password(password)

        instance.save()
        return instance

# ==========================================
# SERIALIZER PERSONALIZADO PARA LOGIN (JWT)
# ==========================================

class MiPerfilSerializer(serializers.ModelSerializer):
    """El perfil del propio usuario (`users/me/`). Solo puede cambiar su
    nombre y su foto; todo lo demás —correo, rol, suscripción— es de solo
    lectura: se cambia por otros caminos (pagos, panel admin)."""
    foto_perfil = serializers.ImageField(required=False)

    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'nombre', 'email', 'rol', 'is_staff',
            'estado_suscripcion', 'idioma', 'fecha_registro', 'foto_perfil',
        ]
        read_only_fields = [
            'id', 'username', 'email', 'rol', 'is_staff', 'estado_suscripcion', 'idioma', 'fecha_registro',
        ]

    def validate_nombre(self, valor):
        valor = valor.strip()
        if not valor:
            raise serializers.ValidationError('El nombre no puede estar vacío.')
        return valor

    def validate_foto_perfil(self, archivo):
        return preparar_foto_perfil(archivo)

    def update(self, instance, validated_data):
        foto_anterior = instance.foto_perfil if 'foto_perfil' in validated_data else None
        nombre_anterior = foto_anterior.name if foto_anterior else None
        instance = super().update(instance, validated_data)
        # Se borra la foto vieja solo después de guardar la nueva con éxito.
        if nombre_anterior and nombre_anterior != instance.foto_perfil.name:
            instance.foto_perfil.storage.delete(nombre_anterior)
        return instance

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    # "Mantener sesión abierta" del formulario de login. Si no se marca, el
    # refresh token dura solo DURACION_SESION_CORTA en vez de los 7 días.
    remember_me = serializers.BooleanField(required=False, default=False, write_only=True)

    def validate(self, attrs):
        # Se guarda antes de llamar a super(), que es quien invoca get_token().
        self._remember_me = attrs.pop('remember_me', False)
        data = super().validate(attrs)
        data['user'] = datos_usuario_para_login(self.user)
        return data

    # En la clase base es un classmethod que emite el refresh token con la
    # duración default. Se sobrescribe aquí (como método de instancia, para
    # tener acceso a la preferencia) en vez de generar un segundo token
    # después de super().validate(): así cada login registra exactamente UNA
    # fila en OutstandingToken, no una válida más una huérfana descartada.
    def get_token(self, user):
        return crear_refresh_token(user, self._remember_me)


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """
    Con ROTATE_REFRESH_TOKENS=True, cada llamada a /auth/refresh/ reemplaza
    el refresh token por uno nuevo — sin esto, ese nuevo token volvería a la
    duración default (7 días) sin importar que el login haya sido sin
    "mantener sesión abierta". Se lee la preferencia guardada en el token
    ENTRANTE (antes de que se rote) y se reaplica al nuevo.
    """
    def validate(self, attrs):
        token_entrante = RefreshToken(attrs['refresh'])
        # Un token sin el claim solo puede ser uno emitido antes de que
        # existiera esta lógica, y esos ya duraban 7 días: se respeta.
        remember_me = bool(token_entrante.get(CLAIM_REMEMBER_ME, True))

        data = super().validate(attrs)

        if not remember_me:
            # super() ya rotó el token (mismo objeto: los claims propios,
            # remember_me incluido, se conservan) con la duración default y
            # registró su fila en OutstandingToken con ese vencimiento. Se
            # acorta el token y se corrige la fila para que coincidan; si no,
            # flushexpiredtokens la conservaría 6 días más de lo real.
            nuevo_refresh = RefreshToken(data['refresh'])
            nuevo_refresh.set_exp(lifetime=DURACION_SESION_CORTA)
            OutstandingToken.objects.filter(jti=nuevo_refresh['jti']).update(
                expires_at=datetime_from_epoch(nuevo_refresh['exp']),
            )
            data['refresh'] = str(nuevo_refresh)

        return data


class GoogleLoginSerializer(serializers.Serializer):
    token = serializers.CharField(
        error_messages={
            'required': 'Falta el token de Google.',
            'blank': 'Falta el token de Google.',
        },
    )
    # Mismo checkbox "Mantener sesión abierta" que el login por contraseña.
    remember_me = serializers.BooleanField(required=False, default=False)

# ==========================================
# SERIALIZADOR DE REGISTRO 
# ==========================================
class DatosRegistroSerializer(serializers.ModelSerializer):
    """Los datos del formulario de registro y sus validaciones (correo y
    usuario libres). No crea nada: lo usa tal cual el paso que manda el
    código de verificación, para no hacer verificar un correo cuyo registro
    luego iba a fallar por otro dato."""
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = Usuario
        fields = ['username', 'email', 'nombre', 'password']

    def validate_email(self, value):
        email = normalizar_correo(value)
        if Usuario.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Ya existe un usuario registrado con este correo electrónico.")
        return email


class RegistroSerializer(DatosRegistroSerializer):
    """El registro en sí: los mismos datos más el código que se mandó al
    correo. Sin un código válido no se crea la cuenta (ni se llega a cobrar),
    aunque la petición no venga de nuestra pantalla."""
    codigo = serializers.CharField(write_only=True, max_length=LONGITUD_CODIGO, trim_whitespace=True)

    class Meta(DatosRegistroSerializer.Meta):
        fields = DatosRegistroSerializer.Meta.fields + ['codigo']

    def validate(self, datos):
        # Va en validate() y no en validate_codigo(): necesita el correo ya
        # normalizado, y solo debe gastar un intento si lo demás es válido.
        try:
            comprobar_codigo(datos['email'], datos['codigo'])
        except CodigoInvalido as e:
            raise serializers.ValidationError({'codigo': e.mensaje}, code=e.motivo)
        return datos

    def create(self, validated_data):
        # Creamos el usuario asegurando el rol de cliente y estado pendiente de pago
        user = Usuario.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            nombre=validated_data['nombre'],
            password=validated_data['password'],
            rol=Usuario.Rol.CLIENTE,
            estado_suscripcion=Usuario.EstadoSuscripcion.PENDIENTE_PAGO,
            # Lo pasa la vista con serializer.save(idioma=...): no es un dato
            # que el cliente escriba, sale del idioma en que ve el sitio.
            idioma=validated_data.get('idioma') or IDIOMA_POR_DEFECTO,
        )
        # El código ya cumplió: no debe servir para otra cuenta. La vista
        # crea la cuenta dentro de una transacción, así que si el pago no
        # llega a iniciarse esto se revierte junto con la cuenta.
        consumir_codigo(user.email)
        return user


class VerificarCodigoSerializer(serializers.Serializer):
    email = serializers.EmailField()
    codigo = serializers.CharField(max_length=LONGITUD_CODIGO, trim_whitespace=True)
