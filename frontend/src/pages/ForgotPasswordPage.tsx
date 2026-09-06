import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { InputField } from '../components/ui/InputField';
import { Button } from '../components/ui/Button';
import { AuthCard } from '../components/ui/AuthCard';

export const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMensaje('');

        try {
            const data = await authApi.solicitarResetPassword(email);
            setMensaje(data.mensaje || 'Si el correo existe, se ha enviado un enlace de recuperación.');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Ocurrió un error al procesar la solicitud.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthCard
            title="Recuperar Contraseña"
            subtitle="Acceso al sistema"
            description="Ingresa tu correo electrónico registrado para recibir las instrucciones."
        >
            {error && (
                <div className="bg-error/20 border border-error text-on-error-container p-3 rounded-md text-sm text-center">
                    {error}
                </div>
            )}

            {mensaje && (
                <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-900 p-3 rounded-md text-sm text-center">
                    {mensaje}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <InputField
                    id="email"
                    label="Correo electrónico"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@gmail.com"
                    icon="mail"
                    required
                />

                <Button type="submit" loading={loading} className="mt-2">
                    Enviar enlace de recuperación
                </Button>
            </form>

            <div className="text-sm text-center mt-4">
                <Link to="/login" className="text-xs font-mono text-primary hover:text-primary-fixed transition-colors">
                    ← Volver al inicio de sesión
                </Link>
            </div>
        </AuthCard>
    );
};