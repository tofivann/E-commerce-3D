import React from 'react';
import { type Conversacion } from '../../services/chatApi';

interface ConversacionListaProps {
    conversaciones: Conversacion[];
    conversacionActiva: Conversacion | null;
    onSeleccionarConversacion: (conv: Conversacion) => void;
}

export const ConversacionLista: React.FC<ConversacionListaProps> = ({
    conversaciones,
    conversacionActiva,
    onSeleccionarConversacion,
}) => {
    return (
        <div className="w-1/3 border-r border-outline-variant/30 flex flex-col bg-surface-container-low">
            <div className="p-4 border-b border-outline-variant/30">
                <h2 className="text-lg font-bold text-on-surface">Conversaciones</h2>
                <p className="text-xs text-on-surface-variant">Bandeja de atención a clientes</p>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-outline-variant/10">
                {conversaciones.length === 0 ? (
                    <p className="p-4 text-sm text-on-surface-variant text-center">No hay conversaciones activas.</p>
                ) : (
                    conversaciones.map((conv) => {
                        const tieneNoLeidos = conv.mensajes_no_leidos > 0;
                        const isSelected = conversacionActiva?.id === conv.id;

                        return (
                            <div
                                key={conv.id}
                                onClick={() => onSeleccionarConversacion(conv)}
                                className={`p-4 cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                                    isSelected 
                                        ? 'bg-primary-container/40 border-l-4 border-primary' 
                                        : tieneNoLeidos 
                                            ? 'bg-surface-container-high/80 hover:bg-surface-container-high' 
                                            : 'hover:bg-surface-container/55'
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className={`text-sm truncate ${tieneNoLeidos ? 'font-bold text-on-surface' : 'font-medium text-on-surface'}`}>
                                            {conv.usuario_info?.nombre || conv.usuario_info?.username || `Usuario #${conv.usuario}`}
                                        </h3>
                                        {conv.ultimo_mensaje && (
                                            <span className="text-[10px] text-on-surface-variant">
                                                {new Date(conv.ultimo_mensaje.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-on-surface-variant truncate">
                                        {conv.ultimo_mensaje ? conv.ultimo_mensaje.contenido : 'Sin mensajes aún'}
                                    </p>
                                </div>
                                {tieneNoLeidos && (
                                    <span className="bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {conv.mensajes_no_leidos}
                                    </span>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};