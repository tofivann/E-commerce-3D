import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/authApi';
import { InputField } from '../components/ui/InputField';
import { Button } from '../components/ui/Button';
import { AuthCard } from '../components/ui/AuthCard';

export const ResetPasswordPage: React.FC = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const uid = searchParams.get('uid');
    const token = searchParams.get('token');

    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [linkInvalido, setLinkInvalido] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!uid || !token) {
            setError(t('resetPassword.invalidLink'));
            setLinkInvalido(true);
        }
    }, [uid, token, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (nuevaPassword !== confirmarPassword) {
            setError(t('resetPassword.passwordMismatch'));
            return;
        }

        if (!uid || !token) {
            setError(t('resetPassword.missingParams'));
            return;
        }

        setLoading(true);
        setError('');
        setMensaje('');

        try {
            await authApi.confirmarResetPassword({ uid, token, nueva_password: nuevaPassword });
            // El backend siempre responde en español; usamos el texto ya
            // traducido del frontend en vez de mostrar el mensaje del servidor.
            setMensaje(t('resetPassword.successMessage'));
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.response?.data?.detail || t('resetPassword.genericError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthCard
            title={t('resetPassword.title')}
            subtitle={t('resetPassword.subtitle')}
            description={t('resetPassword.description')}
        >
            {error && (
                <div className="bg-error/20 border border-error text-on-error-container p-3 rounded-md text-sm text-center">
                    {error}
                </div>
            )}

            {mensaje && (
                <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-900 p-3 rounded-md text-sm text-center">
                    {mensaje} {t('resetPassword.redirecting')}
                </div>
            )}

            {!linkInvalido && (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <InputField
                        id="nuevaPassword"
                        label={t('resetPassword.newPassword')}
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
                        label={t('resetPassword.confirmNewPassword')}
                        type="password"
                        value={confirmarPassword}
                        onChange={(e) => setConfirmarPassword(e.target.value)}
                        placeholder="••••••••"
                        icon="lock"
                        required
                        isMono
                    />

                    <Button type="submit" loading={loading} className="mt-2" disabled={!!mensaje}>
                        {t('resetPassword.submit')}
                    </Button>
                </form>
            )}

            <div className="text-sm text-center mt-4">
                <Link to="/login" className="text-xs font-mono text-primary hover:text-primary-fixed transition-colors">
                    {t('forgotPassword.backToLogin')}
                </Link>
            </div>
        </AuthCard>
    );
};