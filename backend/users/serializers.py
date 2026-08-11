from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Usuario

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password']
        extra_kwargs = {
            # 'write_only': True evita que el password viaje en la respuesta JSON al consultar
            'password': {'write_only': True, 'required': True} 
        }

    # Sobrescribimos el método create para encriptar la contraseña correctamente
    def create(self, validated_data):
        user = Usuario.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user

    def update(self, instance, validated_data):
        # Si la petición incluye un nuevo password, lo extraemos y encriptamos
        password = validated_data.pop('password', None)
        
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
        data = super().validate(attrs)

        # Inyectamos los datos del usuario en la respuesta del Login
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'first_name': getattr(self.user, 'first_name', ''),
            'last_name': getattr(self.user, 'last_name', ''),
            'is_staff': self.user.is_staff,
        }

        return data