import React from 'react';
import { useTranslation } from 'react-i18next';
import { type Conversacion } from '../../services/chatApi';

interface ChatHeaderProps {
    isAdmin: boolean;
    conversacionActiva: Conversacion;
    onBack?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ isAdmin, conversacionActiva, onBack }) => {
    const { t } = useTranslation();
    return (
        <div className="p-4 border-b border-outline-variant/30 bg-surface flex items-center gap-2 justify-between">
            {isAdmin && onBack && (
                <button
                    type="button"
                    onClick={onBack}
                    aria-label={t('chat.back')}
                    className="md:hidden text-on-surface-variant hover:text-primary transition-colors -ml-1 p-1 shrink-0"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
            )}
            <div className="min-w-0">
                <h3 className="font-semibold text-on-surface truncate">
                    {isAdmin
                        ? t('chat.chatWith', { name: conversacionActiva.usuario_info?.nombre || conversacionActiva.usuario_info?.username })
                        : t('chat.supportTitle')}
                </h3>
                <p className="text-xs text-on-surface-variant">{t('chat.online')}</p>
            </div>
        </div>
    );
};