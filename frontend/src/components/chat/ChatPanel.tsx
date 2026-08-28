import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatApi, type Conversacion, type Mensaje } from '../../services/chatApi';
import { ConversacionLista } from './ConversacionLista';
import { ChatHeader } from './ChatHeader';
import { MensajesLista } from './MensajesLista';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
    isAdmin: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ isAdmin }) => {
    const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
    const [conversacionActiva, setConversacionActiva] = useState<Conversacion | null>(null);
    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const [nuevoMensaje, setNuevoMensaje] = useState('');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const shouldScrollToBottom = useRef(true);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const cargarMensajes = useCallback(async (id: number, hacerScroll: boolean) => {
        try {
            const data = await chatApi.obtenerMensajes(id);
            setMensajes(data);
            if (hacerScroll) {
                setTimeout(scrollToBottom, 50);
            }
        } catch (error) {
            console.error("Error al cargar mensajes", error);
        }
    }, [scrollToBottom]);

    const cargarConversaciones = useCallback(async () => {
        try {
            const data = await chatApi.listarConversaciones();
            setConversaciones(data);

            if (!isAdmin && data.length === 0) {
                const nuevaConv = await chatApi.crearConversacion();
                setConversaciones([nuevaConv]);
                setConversacionActiva(nuevaConv);
            }
        } catch (error) {
            console.error("Error al cargar conversaciones", error);
        }
    }, [isAdmin]);

    // Intervalo general de conversaciones (10s) con limpieza adecuada
    useEffect(() => {
        cargarConversaciones();
        const intervalo = setInterval(cargarConversaciones, 10000);
        return () => clearInterval(intervalo);
    }, [cargarConversaciones]);

    // Selección automática inicial para clientes
    useEffect(() => {
        if (!isAdmin && conversaciones.length > 0 && !conversacionActiva) {
            setConversacionActiva(conversaciones[0]);
        }
    }, [isAdmin, conversaciones, conversacionActiva]);

    // Intervalo específico para mensajes de la conversación activa (4s) con limpieza estricta
    useEffect(() => {
        if (!conversacionActiva) {
            setMensajes([]);
            return;
        }

        cargarMensajes(conversacionActiva.id, true);

        const intervaloMensajes = setInterval(async () => {
            try {
                const data = await chatApi.obtenerMensajes(conversacionActiva.id);
                setMensajes((prevMensajes) => {
                    if (data.length !== prevMensajes.length) {
                        shouldScrollToBottom.current = true;
                        return data;
                    }
                    return prevMensajes;
                });
            } catch (error) {
                console.error("Error actualizando mensajes", error);
            }
        }, 4000);

        return () => clearInterval(intervaloMensajes);
    }, [conversacionActiva?.id, cargarMensajes]);

    useEffect(() => {
        if (shouldScrollToBottom.current) {
            scrollToBottom();
            shouldScrollToBottom.current = false;
        }
    }, [mensajes, scrollToBottom]);

    const handleEnviar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nuevoMensaje.trim() || !conversacionActiva) return;

        const contenidoTemp = nuevoMensaje;
        setNuevoMensaje('');

        try {
            shouldScrollToBottom.current = true;
            const mensajeEnviado = await chatApi.enviarMensaje(conversacionActiva.id, contenidoTemp);
            setMensajes((prev) => [...prev, mensajeEnviado]);
            cargarConversaciones();
        } catch (error) {
            console.error("Error al enviar mensaje", error);
            setNuevoMensaje(contenidoTemp);
        }
    };

    return (
        <div className="flex h-[calc(100vh-120px)] bg-surface border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm">
            {isAdmin && (
                <ConversacionLista 
                    conversaciones={conversaciones}
                    conversacionActiva={conversacionActiva}
                    onSeleccionarConversacion={setConversacionActiva}
                />
            )}

            <div className="flex-1 flex flex-col bg-background">
                {conversacionActiva ? (
                    <>
                        <ChatHeader 
                            isAdmin={isAdmin} 
                            conversacionActiva={conversacionActiva} 
                        />
                        
                        <MensajesLista 
                            mensajes={mensajes} 
                            conversacionActiva={conversacionActiva} 
                            messagesEndRef={messagesEndRef}
                        />
                        
                        <ChatInput 
                            nuevoMensaje={nuevoMensaje}
                            setNuevoMensaje={setNuevoMensaje}
                            onEnviar={handleEnviar}
                        />
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">
                        Selecciona una conversación para comenzar a chatear.
                    </div>
                )}
            </div>
        </div>
    );
};