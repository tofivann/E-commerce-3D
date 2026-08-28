import React, { type RefObject } from 'react';
import { type Mensaje, type Conversacion } from '../../services/chatApi';

interface MensajesListaProps {
    mensajes: Mensaje[];
    conversacionActiva: Conversacion;
    messagesEndRef: RefObject<HTMLDivElement | null>;
}

export const MensajesLista: React.FC<MensajesListaProps> = ({ mensajes, conversacionActiva, messagesEndRef }) => {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {mensajes.map((msg) => {
                const esAdmin = msg.remitente_es_admin;

                const nombreRemitente = esAdmin 
                    ? 'Administrador' 
                    : (msg.remitente_nombre || conversacionActiva.usuario_info?.nombre || 'Cliente');

                const colorNombre = esAdmin ? 'text-[#DAA520]' : 'text-black';

                return (
                    <div key={msg.id} className="flex flex-col w-full items-start">
                        <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-surface-container-high text-on-surface border border-outline-variant/20 rounded-bl-none shadow-sm">
                            <span className={`block text-xs font-bold mb-1 ${colorNombre}`}>
                                {nombreRemitente}
                            </span>
                            <p>{msg.contenido}</p>
                            <span className="block text-[9px] text-right mt-1 text-on-surface-variant">
                                {new Date(msg.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
};