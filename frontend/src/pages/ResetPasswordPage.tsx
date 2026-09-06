import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { InputField } from '../components/ui/InputField';
import { Button } from '../components/ui/Button';
import { AuthCard } from '../components/ui/AuthCard';

export const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const uid = searchParams.get('uid');
    const token = searchParams.get('token');

    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!uid || !token) {
            setError('El enlace de recuperación es inválido o está incompleto.');
        }
    }, [uid, token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (nuevaPassword !== confirmarPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        if (!uid || !token) {
            setError('Faltan parámetros de seguridad en el enlace.');
            return;
        }

        setLoading(true);
        setError('');
        setMensaje('');

        try {
            const data = await authApi.confirmarResetPassword({ uid, token, nueva_password: nuevaPassword });
            setMensaje(data.mensaje || '¡Contraseña actualizada con éxito!');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'El enlace ha expirado o ya fue utilizado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthCard
            title="Nueva Contraseña"
            subtitle="Seguridad de la cuenta"
            description="Introduce tu nueva contraseña segura para acceder a la plataforma."
        >
            {error && (
                <div className="bg-error/20 border border-error text-on-error-container p-3 rounded-md text-sm text-center">
                    {error}
                </div>
            )}

            {mensaje && (
                <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-900 p-3 rounded-md text-sm text-center">
                    {mensaje} Redirigiendo al login...
                </div>
            )}

            {!error.includes('inválido') && (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <InputField
                        id="nuevaPassword"
                        label="Nueva contraseña"
                        type="password"
                        value={nuevaPassword}
                        onChange={(e) => setNuevaPassword(e.target.value)}
                        placeholder="••••••••"
                        icon="lock"
                        required
                        isMono
                    />

                    <InputField
                        id="confirmarPassword"
                        label="Confirmar nueva contraseña"
                        type="password"
                        value={confirmarPassword}
                        onChange={(e) => setConfirmarPassword(e.target.value)}
                        placeholder="••••••••"
                        icon="lock"
                        required
                        isMono
                    />

                    <Button type="submit" loading={loading} className="mt-2" disabled={!!mensaje}>
                        Guardar nueva contraseña
                    </Button>
                </form>
            )}

            <div className="text-sm text-center mt-4">
                <Link to="/login" className="text-xs font-mono text-primary hover:text-primary-fixed transition-colors">
                    ← Volver al inicio de sesión
                </Link>
            </div>
        </AuthCard>
    );
};