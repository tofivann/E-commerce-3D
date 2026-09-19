from datetime import timedelta

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Usuario

# Duración del refresh token cuando NO se marca "Mantener sesión abierta" —
# comparado con REFRESH_TOKEN_LIFETIME (7 días, en core/jwt_settings.py) que
# aplica cuando sí se marca.
DURACION_SESION_CORTA = timedelta(days=1)

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'nombre', 'rol', 'estado_suscripcion', 'is_active',
            'fecha_registro', 'password',
        ]
        read_only_fields = ['fecha_registro']
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
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # 'remember_me' no es parte del esquema estándar de login (email +
        # password) — llega como un campo extra en el mismo body, se lee del
        # initial_data crudo. Si no se marca, el refresh token dura solo
        # DURACION_SESION_CORTA en vez de los 7 días completos.
        remember_me = str(self.initial_data.get('remember_me', '')).lower() in ('true', '1')

        data = super().validate(attrs)

        # super().validate() ya generó un refresh/access token con la
        # duración default — lo reemplazamos por uno propio para poder
        # ajustar su duración y guardar la preferencia como claim, así
        # sobrevive a la rotación en /auth/refresh/ (ver
        # CustomTokenRefreshSerializer más abajo).
        refresh = RefreshToken.for_user(self.user)
        refresh['remember_me'] = remember_me
        if not remember_me:
            refresh.set_exp(lifetime=DURACION_SESION_CORTA)
        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)

        # Inyectamos los datos del usuario en la respuesta del Login
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'first_name': getattr(self.user, 'first_name', ''),
            'last_name': getattr(self.user, 'last_name', ''),
            'is_staff': self.user.is_staff,
            'rol': self.user.rol,
            'estado_suscripcion': self.user.estado_suscripcion,
        }

        return data


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
        remember_me = bool(token_entrante.get('remember_me', True))

        data = super().validate(attrs)

        if not remember_me:
            nuevo_refresh = RefreshToken(data['refresh'])
            nuevo_refresh['remember_me'] = False
            nuevo_refresh.set_exp(lifetime=DURACION_SESION_CORTA)
            data['refresh'] = str(nuevo_refresh)

        return data

# ==========================================
# SERIALIZADOR DE REGISTRO 
# ==========================================
class RegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = Usuario
        fields = ['username', 'email', 'nombre', 'password']

    def validate_email(self, value):
        # Convertimos a minúsculas para verificar sin importar si escriben mayúsculas
        email_lower = value.lower()
        
        # Verificamos si ya existe en la base de datos
        if Usuario.objects.filter(email__iexact=email_lower).exists():
            raise serializers.ValidationError("Ya existe un usuario registrado con este correo electrónico.")
        
        return email_lower

    def create(self, validated_data):
        # Creamos el usuario asegurando el rol de cliente y estado pendiente de pago
        user = Usuario.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            nombre=validated_data['nombre'],
            password=validated_data['password'],
            rol=Usuario.Rol.CLIENTE,
            estado_suscripcion=Usuario.EstadoSuscripcion.PENDIENTE_PAGO
        )
        return user