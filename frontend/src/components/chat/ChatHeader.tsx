import React from 'react';
import { type Conversacion } from '../../services/chatApi';

interface ChatHeaderProps {
    isAdmin: boolean;
    conversacionActiva: Conversacion;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ isAdmin, conversacionActiva }) => {
    return (
        <div className="p-4 border-b border-outline-variant/30 bg-surface flex items-center justify-between">
            <div>
                <h3 className="font-semibold text-on-surface">
                    {isAdmin 
                        ? `Chat con ${conversacionActiva.usuario_info?.nombre || conversacionActiva.usuario_info?.username}` 
                        : 'Soporte Técnico / Atención al Cliente'}
                </h3>
                <p className="text-xs text-on-surface-variant">En línea</p>
            </div>
        </div>
    );
};