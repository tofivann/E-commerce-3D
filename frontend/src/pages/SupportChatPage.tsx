import React from "react";
import { ChatPanel } from "../components/chat/ChatPanel";

interface SupportChatPageProps {
  isStaff?: boolean;
}

// "Chat con Mimi". El menú y la barra los pone AppLayout; el chat ya es un
// panel, así que va sin bandeja. .interactivo: recupera el ratón, que la capa
// de contenido deja pasar a la escena.
export const SupportChatPage: React.FC<SupportChatPageProps> = ({ isStaff = false }) => (
  <div className="interactivo">
    <ChatPanel isAdmin={isStaff} />
  </div>
);
