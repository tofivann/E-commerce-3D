import React from 'react';

interface ChatInputProps {
    nuevoMensaje: string;
    setNuevoMensaje: (val: string) => void;
    onEnviar: (e: React.FormEvent) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ nuevoMensaje, setNuevoMensaje, onEnviar }) => {
    return (
        <form onSubmit={onEnviar} className="p-4 border-t border-outline-variant/30 bg-surface flex gap-2">
            <input
                type="text"
                value={nuevoMensaje}
                onChange={(e) => setNuevoMensaje(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-surface-container-high border border-outline-variant/40 rounded-lg px-4 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <button
                type="submit"
                disabled={!nuevoMensaje.trim()}
                className="bg-primary text-on-primary px-5 py-2 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
                Enviar
            </button>
        </form>
    );
};